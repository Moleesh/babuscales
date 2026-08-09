use tauri::State;

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{AssetDraft, AssetMetaRow};

#[tauri::command]
pub fn get_asset_meta(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Option<AssetMetaRow>, AppError> {
    let conn = lock(&state)?;
    store::get_asset_meta(&conn, &asset_id)
}

#[tauri::command]
pub fn get_asset_bytes(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Option<Vec<u8>>, AppError> {
    let conn = lock(&state)?;
    store::get_asset_bytes(&conn, &asset_id)
}

#[tauri::command]
pub fn list_asset_meta(
    state: State<'_, AppState>,
    owner_id: String,
) -> Result<Vec<AssetMetaRow>, AppError> {
    let conn = lock(&state)?;
    store::list_asset_meta(&conn, &owner_id)
}

#[tauri::command]
pub fn put_asset(state: State<'_, AppState>, draft: AssetDraft) -> Result<AssetMetaRow, AppError> {
    let conn = lock(&state)?;
    store::put_asset(&conn, &draft)
}
