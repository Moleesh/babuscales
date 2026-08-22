//! Mirrors `src/db/adapters/memory/masters.ts`.

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::dto::{MasterDraft, MasterQuery, MasterRow};
use super::ids::new_id;
use super::time::now_iso;
use crate::error::AppError;

fn row_to_master(row: &Row) -> rusqlite::Result<MasterRow> {
    let body_text: String = row.get("body")?;
    Ok(MasterRow {
        master_id: row.get("master_id")?,
        master_kind: row.get("master_kind")?,
        name: row.get("name")?,
        body: serde_json::from_str(&body_text).unwrap_or(serde_json::Value::Null),
        is_active: row.get::<_, i64>("is_active")? != 0,
        updated_at: row.get("updated_at")?,
    })
}

const SELECT_MASTER: &str =
    "SELECT master_id, master_kind, name, body, is_active, updated_at FROM master";

pub fn get_master(conn: &Connection, master_id: &str) -> Result<Option<MasterRow>, AppError> {
    let sql = format!("{SELECT_MASTER} WHERE master_id = ?1");
    Ok(conn
        .query_row(&sql, params![master_id], row_to_master)
        .optional()?)
}

pub fn list_masters(conn: &Connection, query: &MasterQuery) -> Result<Vec<MasterRow>, AppError> {
    let mut sql = SELECT_MASTER.to_string();
    let mut clauses = Vec::new();
    if query.master_kind.is_some() {
        clauses.push("master_kind = :master_kind");
    }
    if query.is_active.is_some() {
        clauses.push("is_active = :is_active");
    }
    // SQLite's `LIKE` is ASCII-case-insensitive by default, matching the
    // memory adapter's `toLowerCase().includes(...)` closely enough for a
    // substring search over master names.
    if query.search.is_some() {
        // Without ESCAPE, `%`/`_` typed into the search box act as SQL
        // wildcards rather than literal characters — a search for "A_1"
        // would silently also match "AB1". `\` is escaped into the pattern
        // below alongside them so a literal backslash in the search term
        // doesn't itself get read as an escape introducer.
        clauses.push("name LIKE :search ESCAPE '\\'");
    }
    // Keyset pagination: "the next rows after the one the caller last saw",
    // in the same `name COLLATE NOCASE ASC, master_id` order the query
    // returns. `name` has no column-level COLLATE, so a plain SQLite
    // row-value comparison `(name, master_id) > (:n, :m)` would fall back to
    // binary collation on `name` and disagree with ORDER BY — spelled out
    // long-hand with an explicit COLLATE NOCASE instead.
    if query.after.is_some() {
        clauses.push(
            "(name COLLATE NOCASE > :after_name \
              OR (name COLLATE NOCASE = :after_name AND master_id > :after_master_id))",
        );
    }
    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }
    sql.push_str(" ORDER BY name COLLATE NOCASE ASC, master_id ASC");
    if query.limit.is_some() {
        sql.push_str(" LIMIT :limit");
    }

    let mut statement = conn.prepare(&sql)?;
    let mut named = Vec::<(&str, &dyn rusqlite::ToSql)>::new();
    if let Some(v) = &query.master_kind {
        named.push((":master_kind", v));
    }
    let is_active_int = query.is_active.map(|b| b as i64);
    if let Some(v) = &is_active_int {
        named.push((":is_active", v));
    }
    let search_pattern = query.search.as_ref().map(|s| {
        let escaped = s.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
        format!("%{escaped}%")
    });
    if let Some(v) = &search_pattern {
        named.push((":search", v));
    }
    if let Some(after) = &query.after {
        named.push((":after_name", &after.name));
        named.push((":after_master_id", &after.master_id));
    }
    if let Some(limit) = &query.limit {
        named.push((":limit", limit));
    }

    let rows = statement
        .query_map(named.as_slice(), row_to_master)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

// Hard delete, not another `is_active` flip — task: "we need an option to
// remove the rows in master", on top of the already-existing
// Activate/Deactivate toggle (`save_master`'s `is_active`), which only ever
// hides a row from the picker, never actually gets rid of it. Masters have
// no FK from `ticket`/`ticket_body` (a captured Vehicle/Party/etc. is stored
// as a plain name string, matched by name at save time —
// `upsertTypedMasters.ts`), so a row can be removed outright with nothing
// left dangling.
pub fn delete_master(conn: &Connection, master_id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM master WHERE master_id = ?1", params![master_id])?;
    Ok(())
}

pub fn save_master(conn: &Connection, draft: &MasterDraft) -> Result<MasterRow, AppError> {
    let existing = match &draft.master_id {
        Some(id) => get_master(conn, id)?,
        None => None,
    };
    let master_id = existing
        .as_ref()
        .map(|m| m.master_id.clone())
        .or_else(|| draft.master_id.clone())
        .unwrap_or_else(new_id);
    let is_active = draft
        .is_active
        .or_else(|| existing.as_ref().map(|m| m.is_active))
        .unwrap_or(true);
    let updated_at = now_iso();
    let body_text =
        serde_json::to_string(&draft.body).map_err(|e| AppError::Message(e.to_string()))?;

    conn.execute(
        "INSERT INTO master (master_id, master_kind, name, body, is_active, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(master_id) DO UPDATE SET
           master_kind = excluded.master_kind, name = excluded.name, body = excluded.body,
           is_active = excluded.is_active, updated_at = excluded.updated_at",
        params![
            master_id,
            draft.master_kind,
            draft.name,
            body_text,
            is_active as i64,
            updated_at
        ],
    )?;

    get_master(conn, &master_id)?
        .ok_or_else(|| AppError::Message("saveMaster: row vanished after write".into()))
}
