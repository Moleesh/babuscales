//! PLAN §14 — real data must never exist without a way out of the file it
//! lives in. Unlike the memory adapter's ad hoc JSON snapshot, this exports
//! the actual `VACUUM INTO` SQLite file `store::backup_database` already
//! checksums and integrity-checks — a real backup, not a re-derived one.

use rusqlite::Connection;
use tauri::State;

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;

#[tauri::command]
pub fn export_backup(state: State<'_, AppState>) -> Result<Vec<u8>, AppError> {
    let conn = lock(&state)?;
    let tmp_path = state.db_path.with_extension("db.export-tmp");
    store::backup_database(&conn, &tmp_path)?;
    let bytes = std::fs::read(&tmp_path)?;
    let _ = std::fs::remove_file(&tmp_path);
    Ok(bytes)
}

#[tauri::command]
pub fn import_backup(state: State<'_, AppState>, bytes: Vec<u8>) -> Result<(), AppError> {
    let tmp_path = state.db_path.with_extension("db.import-tmp");
    std::fs::write(&tmp_path, &bytes)?;

    let mut conn = lock(&state)?;
    // `restore` requires no open connection to `db_path` (store/backup.rs) —
    // replacing this connection with a throwaway in-memory one releases
    // SQLite's file lock on it before the file gets overwritten.
    *conn = Connection::open_in_memory()?;
    let restore_result = store::restore_database(&state.db_path, &tmp_path);
    let _ = std::fs::remove_file(&tmp_path);

    // Reopen `db_path` regardless of whether the restore above succeeded —
    // if it failed, the file at `db_path` is unchanged, so this just puts
    // the live connection back the way it was rather than leaving the app
    // running against the throwaway in-memory database until restart.
    let reopened = store::open(&state.db_path);
    restore_result?;
    *conn = reopened?;
    Ok(())
}
