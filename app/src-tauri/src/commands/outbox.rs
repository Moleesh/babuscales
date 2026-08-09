use tauri::State;

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

#[tauri::command]
pub fn list_outbox(
    state: State<'_, AppState>,
    query: Option<OutboxQuery>,
) -> Result<Vec<OutboxRow>, AppError> {
    let conn = lock(&state)?;
    store::list_outbox(&conn, &query.unwrap_or_default())
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
