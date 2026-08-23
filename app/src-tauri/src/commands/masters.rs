use tauri::{Manager, State};

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{MasterDraft, MasterQuery, MasterRow};

// `async fn` + `spawn_blocking` (not the plain sync `fn` these were before)
// — same fix, same reasoning, as `get_doc`/`list_docs` in commands/docs.rs
// (see that file's own doc comment): these are unbounded read paths behind
// the same single `AppState.conn` mutex every other command (including
// ticket save) serialises through, so a slow scan here would hold that lock
// and stall whatever else needed it next. `save_master`/`delete_master`
// stay plain sync `fn` — same precedent docs.rs set by leaving its own
// writes (`save_doc`, `allocate_doc_seq`, ...) synchronous.
#[tauri::command]
pub async fn get_master(
    app: tauri::AppHandle,
    master_id: String,
) -> Result<Option<MasterRow>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let conn = lock(&state)?;
        store::get_master(&conn, &master_id)
    })
    .await
    .map_err(|err| AppError::Message(format!("get_master task panicked: {err}")))?
}

#[tauri::command]
pub async fn list_masters(
    app: tauri::AppHandle,
    query: Option<MasterQuery>,
) -> Result<Vec<MasterRow>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let conn = lock(&state)?;
        store::list_masters(&conn, &query.unwrap_or_default())
    })
    .await
    .map_err(|err| AppError::Message(format!("list_masters task panicked: {err}")))?
}

#[tauri::command]
pub fn save_master(state: State<'_, AppState>, draft: MasterDraft) -> Result<MasterRow, AppError> {
    let conn = lock(&state)?;
    store::save_master(&conn, &draft)
}

#[tauri::command]
pub fn delete_master(state: State<'_, AppState>, master_id: String) -> Result<(), AppError> {
    let conn = lock(&state)?;
    store::delete_master(&conn, &master_id)
}
