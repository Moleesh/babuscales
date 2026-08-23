use tauri::{Manager, State};

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{OutboxDraft, OutboxPatch, OutboxQuery, OutboxRow};

#[tauri::command]
pub fn enqueue_outbox(
    state: State<'_, AppState>,
    draft: OutboxDraft,
) -> Result<OutboxRow, AppError> {
    let conn = lock(&state)?;
    store::enqueue_outbox(&conn, &draft)
}

// `async fn` + `spawn_blocking` — same fix, same reasoning, as `get_doc`/
// `list_docs` in commands/docs.rs (see that file's own doc comment).
// `enqueue_outbox`/`update_outbox` stay plain sync `fn`, matching that same
// precedent (writes untouched, only the unbounded read/list converted).
#[tauri::command]
pub async fn list_outbox(
    app: tauri::AppHandle,
    query: Option<OutboxQuery>,
) -> Result<Vec<OutboxRow>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let conn = lock(&state)?;
        store::list_outbox(&conn, &query.unwrap_or_default())
    })
    .await
    .map_err(|err| AppError::Message(format!("list_outbox task panicked: {err}")))?
}

#[tauri::command]
pub fn update_outbox(
    state: State<'_, AppState>,
    outbox_id: String,
    patch: OutboxPatch,
) -> Result<OutboxRow, AppError> {
    let conn = lock(&state)?;
    store::update_outbox(&conn, &outbox_id, &patch)
}
