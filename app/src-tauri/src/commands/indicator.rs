use tauri::{AppHandle, State};

use crate::devices::indicator;
use crate::devices::indicator::IndicatorFraming;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<String>, AppError> {
    indicator::list_ports()
}

#[tauri::command]
pub fn open_indicator_port(
    app: AppHandle,
    state: State<'_, AppState>,
    port: String,
    baud: u32,
    pattern: Option<String>,
    framing: Option<IndicatorFraming>,
) -> Result<(), AppError> {
    indicator::open(
        &app,
        &state.indicator,
        &port,
        baud,
        pattern.as_deref(),
        framing.unwrap_or_default(),
    )
}

#[tauri::command]
pub fn close_indicator_port(state: State<'_, AppState>) -> Result<(), AppError> {
    indicator::close(&state.indicator);
    Ok(())
}
