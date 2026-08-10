use tauri::{AppHandle, State};

use crate::error::AppError;
use crate::net::{self, VerificationServerStatus};
use crate::state::AppState;

/// PLAN §18/§23 item 6 — LAN-only by default, the port a fixed default the
/// operator can share by URL. Not exposed as a Settings field yet (single
/// fixed port is enough for one weighbridge; a picker is future work if two
/// instances ever need to share a machine — app/README.md known gap).
const DEFAULT_PORT: u16 = 8420;

#[tauri::command]
pub fn start_verification_server(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<VerificationServerStatus, AppError> {
    net::open(&app, &state.verification_server, DEFAULT_PORT)
}

#[tauri::command]
pub fn stop_verification_server(state: State<'_, AppState>) -> Result<(), AppError> {
    net::close(&state.verification_server);
    Ok(())
}

#[tauri::command]
pub fn verification_server_status(
    state: State<'_, AppState>,
) -> Result<Option<VerificationServerStatus>, AppError> {
    net::status(&state.verification_server)
}
