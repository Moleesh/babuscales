//! The one thing every command shares: a single open connection to the one
//! database file (PLAN §6.4 — "one file, no ATTACH"), behind a `Mutex` so
//! concurrent `invoke()` calls from the frontend serialise through it
//! rather than racing SQLite's own locking.

use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;

use crate::error::AppError;

pub struct AppState {
    pub conn: Mutex<Connection>,
    /// Kept alongside the connection so `export_backup`/`import_backup`
    /// (commands/backup.rs) don't need to re-derive the app data directory
    /// on every call.
    pub db_path: PathBuf,
}

/// `unwrap()`/`expect()` are banned outside `main.rs` (docs/CodingStandards.md)
/// — a poisoned mutex (a prior command panicked while holding the lock)
/// becomes a normal `AppError` instead, so one bad command degrades the app
/// gracefully rather than taking every future command down with it.
pub fn lock(state: &AppState) -> Result<std::sync::MutexGuard<'_, Connection>, AppError> {
    state
        .conn
        .lock()
        .map_err(|_| AppError::Message("database connection lock was poisoned".into()))
}
