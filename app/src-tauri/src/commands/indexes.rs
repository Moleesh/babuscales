//! Expression-index manager (PLAN §6.3, §21 Medium bucket) — create/drop
//! SQLite expression indexes on a JSON field inside `doc.body` or
//! `master.body`, without altering either table. Definitions persist as
//! `config` rows with `config_kind = "Index"` (via the existing generic
//! `store::save_config`/`store::get_config`), so they travel with backups
//! for free through the existing whole-`config`-table backup path.
//!
//! SQLite cannot parameterise identifiers, so `CREATE INDEX`/`DROP INDEX`
//! are built by string formatting. Every value that reaches that string is
//! validated against a strict allowlist immediately beforehand — see
//! `validate_path` and `validate_index_name` below, and the call sites in
//! `create_custom_index`/`drop_custom_index`, which is the whole of this
//! file's security surface.
//!
//! MVP scope only: create, list, drop. Size/usage stats and slow-query
//! suggestions are explicitly out of scope for this pass.

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{ConfigDraft, ConfigRow};

/// The only two tables this feature may ever touch — a Rust enum, not a
/// free string, so nothing else is even representable regardless of what
/// the frontend sends.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
enum Table {
    Doc,
    Master,
}

impl Table {
    fn parse(raw: &str) -> Result<Self, AppError> {
        match raw {
            "doc" => Ok(Table::Doc),
            "master" => Ok(Table::Master),
            other => Err(AppError::Message(format!(
                "createCustomIndex: unknown table {other:?} — must be \"doc\" or \"master\""
            ))),
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Table::Doc => "doc",
            Table::Master => "master",
        }
    }
}

/// JSON path allowlist: letters/digits/underscore segments, dot-separated,
/// up to 4 segments — e.g. `VehicleNo` or `Address.City`. This is the one
/// user-controlled input in this feature, and it is validated here in the
/// Rust command handler, not just the frontend (frontend validation there
/// is UX only, never trusted).
const PATH_PATTERN: &str = r"^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*){0,3}$";

/// Generated-index-name allowlist — plain identifier characters only. Used
/// as defense in depth on names *this file itself* derives, both when
/// freshly building one in `create_custom_index` and again when reading
/// one back out of a stored config row in `drop_custom_index`.
const INDEX_NAME_PATTERN: &str = r"^[A-Za-z_][A-Za-z0-9_]*$";

fn validate_path(path: &str) -> Result<(), AppError> {
    let re = regex::Regex::new(PATH_PATTERN)
        .map_err(|e| AppError::Message(format!("internal error: bad path regex: {e}")))?;
    if re.is_match(path) {
        Ok(())
    } else {
        Err(AppError::Message(format!(
            "createCustomIndex: invalid path {path:?} — expected dot-separated identifiers, e.g. \"VehicleNo\" or \"Address.City\""
        )))
    }
}

fn validate_index_name(name: &str) -> Result<(), AppError> {
    let re = regex::Regex::new(INDEX_NAME_PATTERN)
        .map_err(|e| AppError::Message(format!("internal error: bad index-name regex: {e}")))?;
    if re.is_match(name) {
        Ok(())
    } else {
        // This name is always derived by this file, never typed by an
        // admin — landing here means the derivation logic itself has a
        // bug, so this is an internal error, not a user-input error.
        Err(AppError::Message(format!(
            "internal error: generated index name {name:?} failed validation"
        )))
    }
}

fn derive_index_name(table: Table, path: &str) -> String {
    format!("ix_custom_{}_{}", table.as_str(), path.replace('.', "_"))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct IndexBody {
    index_name: String,
    table: String,
    path: String,
    active: bool,
}

#[tauri::command]
pub fn create_custom_index(
    state: State<'_, AppState>,
    table: String,
    path: String,
) -> Result<ConfigRow, AppError> {
    // 1. Table must parse into the closed enum — nothing else is
    //    representable (commands/indexes.rs:39-49).
    let table = Table::parse(&table)?;
    // 2. Path must match PATH_PATTERN, the one user-controlled input
    //    (commands/indexes.rs:78-87).
    validate_path(&path)?;
    // 3. The derived name is re-validated against INDEX_NAME_PATTERN
    //    before it ever reaches SQL (commands/indexes.rs:89-100), even
    //    though it is built purely from the two already-validated values
    //    above.
    let index_name = derive_index_name(table, &path);
    validate_index_name(&index_name)?;

    let conn = lock(&state)?;
    execute_create(&conn, table, &path, &index_name)?;

    let draft = ConfigDraft {
        config_id: None,
        config_kind: "Index".to_string(),
        body: serde_json::to_value(IndexBody {
            index_name,
            table: table.as_str().to_string(),
            path,
            active: true,
        })
        .map_err(|e| AppError::Message(e.to_string()))?,
        version: None,
    };
    store::save_config(&conn, &draft)
}

/// The only place a `CREATE INDEX` string is built. Both `table` (a
/// closed enum, not a free string) and `index_name`/`path` (regex-checked
/// by the caller immediately before this is invoked) are already validated
/// by the time this runs.
fn execute_create(
    conn: &Connection,
    table: Table,
    path: &str,
    index_name: &str,
) -> Result<(), AppError> {
    let sql = format!(
        "CREATE INDEX IF NOT EXISTS {index_name} ON {} (json_extract(body, '$.{path}'))",
        table.as_str()
    );
    conn.execute(&sql, [])?;
    Ok(())
}

#[tauri::command]
pub fn drop_custom_index(
    state: State<'_, AppState>,
    config_id: String,
) -> Result<ConfigRow, AppError> {
    let conn = lock(&state)?;

    let row = store::get_config(&conn, &config_id)?.ok_or_else(|| {
        AppError::Message(format!("dropCustomIndex: no config row {config_id:?}"))
    })?;
    if row.config_kind != "Index" {
        return Err(AppError::Message(format!(
            "dropCustomIndex: config row {config_id:?} is not an Index row (kind {:?})",
            row.config_kind
        )));
    }
    let mut body: IndexBody = serde_json::from_value(row.body.clone())
        .map_err(|e| AppError::Message(format!("dropCustomIndex: malformed index body: {e}")))?;

    // Re-validate the stored name against INDEX_NAME_PATTERN before
    // interpolating it into DROP INDEX — never trust a value read back
    // from our own database without re-checking it (commands/indexes.rs:89-100).
    validate_index_name(&body.index_name)?;

    let sql = format!("DROP INDEX IF EXISTS {}", body.index_name);
    conn.execute(&sql, [])?;

    body.active = false;
    let draft = ConfigDraft {
        config_id: Some(config_id),
        config_kind: "Index".to_string(),
        body: serde_json::to_value(&body).map_err(|e| AppError::Message(e.to_string()))?,
        version: None,
    };
    store::save_config(&conn, &draft)
}
