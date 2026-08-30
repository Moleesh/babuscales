//! Tauri commands — the only surface the frontend calls through `invoke()`.
//! Each command validates its input (via serde deserialisation into the
//! `store::dto` shapes) and delegates straight to `store`; no business
//! logic lives here — PLAN §5, Rust stays confined to hardware, storage
//! and transport. One file per resource, mirroring both `store/`'s own
//! split and the TS memory adapter's (`src/db/adapters/memory/`).

pub mod assets;
pub mod audit;
pub mod backup;
pub mod board;
pub mod configs;
pub mod docs;
pub mod email;
pub mod indicator;
pub mod licensing;
pub mod masters;
pub mod net;
pub mod outbox;
pub mod printers;
pub mod scheduler;
pub mod sms;
pub mod tally;
pub mod tunnel;
pub mod webhook;
pub mod window;

use rusqlite::Connection;
use tauri::Manager;

use crate::error::AppError;
use crate::state::{lock, AppState};

/// Runs a blocking store query off the async runtime's worker thread and
/// against the shared `AppState` connection.
///
/// This is the `spawn_blocking` + `state.lock()` + delegate-to-`store` shape
/// that `get_doc`/`list_docs`, `get_master`/`list_masters`,
/// `get_config`/`list_config`, `list_audit` and `list_outbox` all repeated by
/// hand (see `commands/docs.rs`'s `get_doc`/`list_docs` doc comment for why
/// these unbounded reads were moved off the main async worker in the first
/// place — the short version: they sit behind the same single `AppState.conn`
/// mutex every other command serialises through, so a slow scan here would
/// stall whatever else needed that lock next). `f` receives the locked
/// `Connection` and must be `'static` + `Send` so it can move into the
/// `spawn_blocking` closure; `AppHandle` is taken (rather than `State`) for
/// the same reason the call sites originally did — `State`'s borrow doesn't
/// outlive this function's stack frame, so the closure re-derives the same
/// managed `AppState` via `AppHandle::state()` instead.
pub async fn run_blocking<T, F>(app: &tauri::AppHandle, task_name: &str, f: F) -> Result<T, AppError>
where
    F: FnOnce(&Connection) -> Result<T, AppError> + Send + 'static,
    T: Send + 'static,
{
    let app = app.clone();
    let task_name = task_name.to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let conn = lock(&state)?;
        f(&conn)
    })
    .await
    .map_err(|err| AppError::Message(format!("{task_name} task panicked: {err}")))?
}
