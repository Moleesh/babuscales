use tauri::State;

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{AuditDraft, AuditQuery, AuditRow};

#[tauri::command]
pub fn append_audit(state: State<'_, AppState>, draft: AuditDraft) -> Result<AuditRow, AppError> {
    let mut conn = lock(&state)?;
    store::append_audit(&mut conn, &draft)
}

#[tauri::command]
pub fn list_audit(
    state: State<'_, AppState>,
    query: Option<AuditQuery>,
) -> Result<Vec<AuditRow>, AppError> {
    let conn = lock(&state)?;
    store::list_audit(&conn, &query.unwrap_or_default())
}
