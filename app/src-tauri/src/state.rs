//! The one thing every command shares: a single open connection to the one
//! database file (PLAN §6.4 — "one file, no ATTACH"), behind a `Mutex` so
//! concurrent `invoke()` calls from the frontend serialise through it
//! rather than racing SQLite's own locking.

use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;

use crate::devices::indicator::IndicatorState;
use crate::error::AppError;
use crate::net::tunnel::TunnelHandleState;
use crate::net::VerificationServerState;

pub struct AppState {
    pub conn: Mutex<Connection>,
    /// Kept alongside the connection so `export_backup`/`import_backup`
    /// (commands/backup.rs) don't need to re-derive the app data directory
    /// on every call.
    pub db_path: PathBuf,
    /// The one open serial connection to the weight indicator, if any
    /// (`devices::indicator`) — same "one thing every command shares"
    /// shape as `conn` above, just for hardware instead of storage.
    /// `pub(crate)`, not `pub` — `IndicatorState` is crate-internal (see
    /// `devices::indicator`'s own comment), so this field can't be any
    /// more visible than that without the compiler rightly complaining.
    pub(crate) indicator: IndicatorState,
    /// The QR verification LAN server, if running — same shape and same
    /// visibility reasoning as `indicator` above (`net`'s own doc comment).
    pub(crate) verification_server: VerificationServerState,
    /// The Cloudflare Tunnel connector process, if running — same shape and
    /// same visibility reasoning as `indicator`/`verification_server` above
    /// (`net::tunnel`'s own doc comment).
    pub(crate) tunnel: TunnelHandleState,
}

/// `unwrap()`/`expect()` are banned outside `main.rs` (docs/CodingStandards.md)
/// — a poisoned mutex (a prior command panicked while holding the lock)
/// becomes a normal `AppError` instead, so one bad command degrades the app
/// gracefully rather than taking every future command down with it.
pub fn lock(state: &AppState) -> Result<std::sync::MutexGuard<'_, Connection>, AppError> {
    state
        .conn
        .lock()
        .map_err(|_| AppError::Message("database connection lock was poisoned".into()))
}
