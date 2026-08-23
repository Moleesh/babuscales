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

    // `*conn` must never be left pointed at the throwaway in-memory database
    // once this function returns, Ok or Err — that would silently strand the
    // live app on a database nothing gets saved to until restart. The old
    // version here computed `reopened` and then did `restore_result?`
    // *before* assigning `reopened` to `*conn` — if `restore_result` was an
    // `Err`, that `?` returned early with `*conn` never reassigned, leaving
    // it stuck on the in-memory placeholder. Every path below re-derives a
    // real connection to `db_path` and assigns it to `*conn` before
    // returning, whether that return is `Ok` or `Err`:
    match restore_result {
        Ok(()) => match store::open(&state.db_path) {
            Ok(reopened) => {
                *conn = reopened;
                Ok(())
            }
            Err(first_err) => {
                // Restore itself succeeded, so `db_path` on disk is the
                // freshly restored database — a failure to reopen it is
                // most likely transient (disk hiccup, AV scan holding a
                // handle, ...), so one retry before giving up is worth it.
                match store::open(&state.db_path) {
                    Ok(reopened) => {
                        *conn = reopened;
                        Ok(())
                    }
                    Err(_) => {
                        // Both attempts failed even though the restore
                        // wrote successfully. There is no real connection
                        // left to fall back to here — `db_path` itself
                        // appears unreadable right now — so `*conn` stays
                        // on the in-memory placeholder as the least-bad
                        // remaining option. Surfacing the error is the best
                        // this function can do; the app needs a restart
                        // (retried the next time it opens `db_path` fresh)
                        // to recover.
                        Err(first_err)
                    }
                }
            }
        },
        Err(restore_err) => {
            // Restore failed, so `db_path` on disk is unchanged. Put the
            // live connection back on it (best-effort — if even this
            // fails, `*conn` is still in-memory, but that's now a
            // secondary failure layered on the original one rather than a
            // silent one this function created).
            if let Ok(reopened) = store::open(&state.db_path) {
                *conn = reopened;
            }
            Err(restore_err)
        }
    }
}
