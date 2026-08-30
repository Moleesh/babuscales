use tauri::State;

use crate::commands::run_blocking;
use crate::error::AppError;
use crate::licensing;
use crate::state::{lock, AppState};
use crate::store;
use crate::store::dto::{DocDraft, DocQuery, DocRow, SeriesEpoch};

// `async fn` + `spawn_blocking` (not the plain sync `fn` these were before)
// — task: "reports and weighing start to lag, freeze the cursor for secs".
// `get_doc`/`list_docs` are the two read paths every tab switch triggers
// (useTicketDocs.ts, useReportDocs.ts, both unbounded `listDocs` fetches),
// and every other command (save/settings/masters/...) serialises through
// the same single `AppState.conn` mutex (state.rs's own doc comment) — a
// slow scan/serialize here held that lock and stalled whatever else needed
// it next, reading as a whole-app freeze rather than just a slow list. A
// plain sync command still runs off Tauri's main thread, but it ties up
// one of its async-runtime worker threads for the whole query; routing the
// blocking SQLite work through `spawn_blocking` explicitly frees that
// worker immediately and lets this resolve like any other async IPC call
// instead of monopolising runtime capacity every navigation. Delegates to
// `commands::run_blocking`, which takes an `AppHandle` instead of `State` so
// the query can move into the blocking closure — `State`'s borrow doesn't
// outlive this function's own stack frame, `AppHandle::state()` re-derives
// the same managed `AppState` inside the closure instead.
#[tauri::command]
pub async fn get_doc(app: tauri::AppHandle, doc_id: String) -> Result<Option<DocRow>, AppError> {
    run_blocking(&app, "get_doc", move |conn| store::get_doc(conn, &doc_id)).await
}

#[tauri::command]
pub async fn list_docs(
    app: tauri::AppHandle,
    query: Option<DocQuery>,
) -> Result<Vec<DocRow>, AppError> {
    run_blocking(&app, "list_docs", move |conn| {
        store::list_docs(conn, &query.unwrap_or_default())
    })
    .await
}

#[tauri::command]
pub fn save_doc(state: State<'_, AppState>, draft: DocDraft) -> Result<DocRow, AppError> {
    let conn = lock(&state)?;
    // The one write a license is actually meant to gate (PLAN §12, §4.10) —
    // see `licensing::require_licensed`'s own doc comment for why only this
    // command, and why a missing license row doesn't block it.
    let app_data_dir = state
        .db_path
        .parent()
        .ok_or_else(|| AppError::Message("could not resolve app data dir from db_path".into()))?;
    licensing::require_licensed(&conn, app_data_dir)?;
    store::save_doc(&conn, &draft)
}

#[tauri::command]
pub fn allocate_doc_seq(state: State<'_, AppState>, doc_id: String) -> Result<DocRow, AppError> {
    let mut conn = lock(&state)?;
    store::allocate_doc_seq(&mut conn, &doc_id)
}

#[tauri::command]
pub fn save_doc_and_allocate_seq(
    state: State<'_, AppState>,
    draft: DocDraft,
) -> Result<DocRow, AppError> {
    let mut conn = lock(&state)?;
    // Same licensing gate as `save_doc` above — this replaces that call (plus
    // a possible follow-up `allocate_doc_seq`) at every call site that used
    // to save then number a ticket as two separate IPC round trips.
    let app_data_dir = state
        .db_path
        .parent()
        .ok_or_else(|| AppError::Message("could not resolve app data dir from db_path".into()))?;
    licensing::require_licensed(&conn, app_data_dir)?;
    store::save_doc_and_allocate_seq(&mut conn, &draft)
}

#[tauri::command]
pub fn reset_doc_series(
    state: State<'_, AppState>,
    doc_kind: String,
    profile_id: String,
    start_seq: Option<i64>,
) -> Result<SeriesEpoch, AppError> {
    let conn = lock(&state)?;
    store::reset_doc_series(&conn, &doc_kind, &profile_id, start_seq.unwrap_or(1))
}
