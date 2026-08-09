use tauri::State;

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{MasterDraft, MasterQuery, MasterRow};

#[tauri::command]
pub fn get_master(
    state: State<'_, AppState>,
    master_id: String,
) -> Result<Option<MasterRow>, AppError> {
    let conn = lock(&state)?;
    store::get_master(&conn, &master_id)
}

#[tauri::command]
pub fn list_masters(
    state: State<'_, AppState>,
    query: Option<MasterQuery>,
) -> Result<Vec<MasterRow>, AppError> {
    let conn = lock(&state)?;
    store::list_masters(&conn, &query.unwrap_or_default())
}

#[tauri::command]
pub fn save_master(state: State<'_, AppState>, draft: MasterDraft) -> Result<MasterRow, AppError> {
    let conn = lock(&state)?;
    store::save_master(&conn, &draft)
}
