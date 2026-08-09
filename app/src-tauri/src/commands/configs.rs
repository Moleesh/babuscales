use tauri::State;

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{ConfigDraft, ConfigQuery, ConfigRow};

#[tauri::command]
pub fn get_config(
    state: State<'_, AppState>,
    config_id: String,
) -> Result<Option<ConfigRow>, AppError> {
    let conn = lock(&state)?;
    store::get_config(&conn, &config_id)
}

#[tauri::command]
pub fn list_config(
    state: State<'_, AppState>,
    query: Option<ConfigQuery>,
) -> Result<Vec<ConfigRow>, AppError> {
    let conn = lock(&state)?;
    store::list_config(&conn, &query.unwrap_or_default())
}

#[tauri::command]
pub fn save_config(state: State<'_, AppState>, draft: ConfigDraft) -> Result<ConfigRow, AppError> {
    let conn = lock(&state)?;
    store::save_config(&conn, &draft)
}
