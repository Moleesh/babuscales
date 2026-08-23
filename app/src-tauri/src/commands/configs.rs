use tauri::{Manager, State};

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{ConfigDraft, ConfigQuery, ConfigRow};

// `async fn` + `spawn_blocking` — same fix, same reasoning, as `get_doc`/
// `list_docs` in commands/docs.rs (see that file's own doc comment).
// `save_config` stays plain sync `fn`, matching that same precedent.
#[tauri::command]
pub async fn get_config(
    app: tauri::AppHandle,
    config_id: String,
) -> Result<Option<ConfigRow>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let conn = lock(&state)?;
        store::get_config(&conn, &config_id)
    })
    .await
    .map_err(|err| AppError::Message(format!("get_config task panicked: {err}")))?
}

#[tauri::command]
pub async fn list_config(
    app: tauri::AppHandle,
    query: Option<ConfigQuery>,
) -> Result<Vec<ConfigRow>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let conn = lock(&state)?;
        store::list_config(&conn, &query.unwrap_or_default())
    })
    .await
    .map_err(|err| AppError::Message(format!("list_config task panicked: {err}")))?
}

#[tauri::command]
pub fn save_config(state: State<'_, AppState>, draft: ConfigDraft) -> Result<ConfigRow, AppError> {
    let conn = lock(&state)?;
    store::save_config(&conn, &draft)
}
