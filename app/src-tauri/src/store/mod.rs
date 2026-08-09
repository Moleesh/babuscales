//! The SQLite connection and the fixed schema (PLAN §6). Create-once
//! tables, an additive-only idempotent patch runner, and nothing that
//! looks like a migration.

use std::path::Path;

use rusqlite::Connection;

use crate::error::AppError;

mod backup;
mod patches;

pub use backup::{backup as backup_database, restore as restore_database, BackupInfo};

const SCHEMA_SQL: &str = include_str!("schema.sql");

/// Opens (creating if absent) the single BabuScale database file, applies
/// the fixed schema, then any additive column patches. Safe to call on
/// every startup — every statement in `schema.sql` is `IF NOT EXISTS` and
/// every patch checks before it writes.
pub fn open(db_path: &Path) -> Result<Connection, AppError> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(db_path)?;
    apply_pragmas(&conn)?;
    conn.execute_batch(SCHEMA_SQL)?;
    patches::apply(&conn)?;
    Ok(conn)
}

/// PLAN §6.1 — order matters. `page_size` is immutable once WAL is
/// enabled, so it must be set first and only ever takes effect on an
/// empty database (a no-op here on every run after the first).
/// `synchronous = FULL` matters because WAL defaults to NORMAL, which does
/// NOT fsync on commit — §6.5's durability claim is false without it.
fn apply_pragmas(conn: &Connection) -> Result<(), AppError> {
    // `Connection::pragma`, not `pragma_update` — several of these (notably
    // `journal_mode` and `busy_timeout`) echo the value they were just set
    // to back as a result row, which `pragma_update`'s plain `execute`
    // rejects. `pragma` calls the closure per row and tolerates zero.
    conn.pragma(None, "page_size", 8192, |_row| Ok(()))?;
    conn.pragma(None, "journal_mode", "WAL", |_row| Ok(()))?;
    conn.pragma(None, "synchronous", "FULL", |_row| Ok(()))?;
    conn.pragma(None, "foreign_keys", "ON", |_row| Ok(()))?;
    conn.pragma(None, "busy_timeout", 5000, |_row| Ok(()))?;
    Ok(())
}
