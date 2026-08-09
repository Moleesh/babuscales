use tauri::State;

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{DocDraft, DocQuery, DocRow, SeriesEpoch};

#[tauri::command]
pub fn get_doc(state: State<'_, AppState>, doc_id: String) -> Result<Option<DocRow>, AppError> {
    let conn = lock(&state)?;
    store::get_doc(&conn, &doc_id)
}

#[tauri::command]
pub fn list_docs(
    state: State<'_, AppState>,
    query: Option<DocQuery>,
) -> Result<Vec<DocRow>, AppError> {
    let conn = lock(&state)?;
    store::list_docs(&conn, &query.unwrap_or_default())
}

#[tauri::command]
pub fn save_doc(state: State<'_, AppState>, draft: DocDraft) -> Result<DocRow, AppError> {
    let conn = lock(&state)?;
    store::save_doc(&conn, &draft)
}

#[tauri::command]
pub fn allocate_doc_seq(state: State<'_, AppState>, doc_id: String) -> Result<DocRow, AppError> {
    let mut conn = lock(&state)?;
    store::allocate_doc_seq(&mut conn, &doc_id)
}

#[tauri::command]
pub fn reset_doc_series(
    state: State<'_, AppState>,
    doc_kind: String,
    profile_id: String,
) -> Result<SeriesEpoch, AppError> {
    let conn = lock(&state)?;
    store::reset_doc_series(&conn, &doc_kind, &profile_id)
}
