use tauri::State;

use crate::error::AppError;
use crate::net::tunnel::{self, TunnelStatus};
use crate::state::AppState;

#[tauri::command]
pub fn save_tunnel_token(token: String) -> Result<(), AppError> {
    tunnel::save_token(&token)
}

#[tauri::command]
pub fn clear_tunnel_token(state: State<'_, AppState>) -> Result<(), AppError> {
    tunnel::clear_token(&state.tunnel)
}

#[tauri::command]
pub fn has_tunnel_token() -> Result<bool, AppError> {
    tunnel::has_token()
}

#[tauri::command]
pub fn start_tunnel(state: State<'_, AppState>) -> Result<TunnelStatus, AppError> {
    tunnel::open(&state.tunnel)
}

#[tauri::command]
pub fn stop_tunnel(state: State<'_, AppState>) -> Result<(), AppError> {
    tunnel::close(&state.tunnel);
    Ok(())
}

#[tauri::command]
pub fn tunnel_status(state: State<'_, AppState>) -> Result<TunnelStatus, AppError> {
    tunnel::status(&state.tunnel)
}
