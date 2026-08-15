use rusqlite::Connection;

use crate::error::AppError;

/// One additive column patch: add `column` to `table` if it is not already
/// there. This is the mechanism VaultBill proved in production
/// (`patchMissingColumns` / `RequiredColumnBuilders.ts`) — no numbered
/// migration chain, just an idempotent check run at every startup
/// (PLAN §6.1: "additive-only, idempotent, startup-applied schema
/// patches. No numbered migration chain, no destructive DDL, ever.").
pub struct ColumnPatch {
    pub table: &'static str,
    pub column: &'static str,
    pub add_column_ddl: &'static str,
}

// Empty — schema.sql is the first and, so far, only version of every
// table. The mechanism exists so a future column never needs a numbered
// migration: add an entry here instead.
//
// Example, for when one is actually needed:
//   ColumnPatch { table: "doc", column: "profile_id",
//                 add_column_ddl: "ALTER TABLE doc ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'default'" }
pub const PATCHES: &[ColumnPatch] = &[ColumnPatch {
    table: "series_counter",
    column: "start_seq",
    add_column_ddl: "ALTER TABLE series_counter ADD COLUMN start_seq INTEGER NOT NULL DEFAULT 1",
}];

// `table` is never user input — it only ever comes from the PATCHES
// constant above, so interpolating it into PRAGMA table_info is safe.
// SQLite has no bound-parameter form for an identifier here.
fn has_column(conn: &Connection, table: &str, column: &str) -> Result<bool, AppError> {
    let mut statement = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let mut rows = statement.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == column {
            return Ok(true);
        }
    }
    Ok(false)
}

pub fn apply(conn: &Connection) -> Result<(), AppError> {
    for patch in PATCHES {
        if !has_column(conn, patch.table, patch.column)? {
            conn.execute(patch.add_column_ddl, [])?;
        }
    }
    Ok(())
}
