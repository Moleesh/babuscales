use tauri::{Manager, State};

use crate::error::AppError;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{AuditDraft, AuditQuery, AuditRow};

#[tauri::command]
pub fn append_audit(state: State<'_, AppState>, draft: AuditDraft) -> Result<AuditRow, AppError> {
    let mut conn = lock(&state)?;
    store::append_audit(&mut conn, &draft)
}

// `async fn` + `spawn_blocking` — same fix, same reasoning, as `get_doc`/
// `list_docs` in commands/docs.rs (see that file's own doc comment).
// `append_audit` above stays plain sync `fn`, matching that same precedent.
#[tauri::command]
pub async fn list_audit(
    app: tauri::AppHandle,
    query: Option<AuditQuery>,
) -> Result<Vec<AuditRow>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let conn = lock(&state)?;
        store::list_audit(&conn, &query.unwrap_or_default())
    })
    .await
    .map_err(|err| AppError::Message(format!("list_audit task panicked: {err}")))?
}
