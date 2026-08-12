//! Optional public reach for the LAN verification server — PLAN §18's own
//! "Remote access — Cloudflare Tunnel" spec: "opt-in, off by default. Free,
//! unlimited bandwidth, real HTTPS on your own domain, outbound-only so the
//! PC is never exposed, works behind CGNAT with no router configuration."
//!
//! Cloudflare's own `cloudflared` binary does the actual tunneling; this
//! module only spawns and supervises it as a child process
//! (`cloudflared tunnel run`, token passed via the `TUNNEL_TOKEN`
//! environment variable rather than `--token` on argv — see `open` below)
//! against a tunnel the operator
//! creates on the Cloudflare Zero Trust dashboard and points at their own
//! domain. Creating the tunnel and mapping a public hostname to
//! `http://localhost:8420` (`commands::net::DEFAULT_PORT`, the verification
//! server's fixed port) is a one-time dashboard step the operator does
//! themselves — this app never talks to the Cloudflare API and never learns
//! or stores a hostname, only the one secret (the connector token) that
//! authorizes this machine to join the tunnel it already exists as.
//!
//! "No tunnel binary is committed" (PLAN §18) — `cloudflared` must already
//! be on PATH. If it isn't, `open` reports that as an ordinary `AppError`
//! rather than fetching or running a binary this app didn't ship with (see
//! the top-level safety note: this app never downloads and executes
//! external binaries on the operator's behalf).
//!
//! The token itself never touches the settings table or a config file —
//! `security::set_secret`/`get_secret` put it in the OS credential store
//! exactly once, on save, and every later start reads it back from there.
//! Same "one background thread, a stop flag it polls" family as
//! `net::open`/`devices::indicator::open`, except there's no stop flag to
//! poll here: killing the child process is itself what ends the reader
//! thread's loop (its stdout pipe closes), so `close` only needs to kill
//! and join, not signal-and-wait.
//!
//! **Known gap** (app/README.md): this only republishes the LAN
//! verification page. There is no public admin web surface — Settings
//! lives in the native app window, not anything this tunnel could expose —
//! so "shared by QR + admin access" (this task's own title) is only half
//! true today; the admin half is future work, not a shortcut taken here.

use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use serde::Serialize;

use crate::error::AppError;
use crate::security;

const TOKEN_ACCOUNT: &str = "cloudflare-tunnel-token";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "PascalCase")]
pub enum TunnelState {
    Stopped,
    Running,
    /// `cloudflared` exited on its own (bad token, no network, the binary
    /// vanished mid-run) — `TunnelStatus.message` carries whatever it last
    /// printed, when it printed anything.
    Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct TunnelStatus {
    pub state: TunnelState,
    /// `cloudflared`'s own last logged line — passed through verbatim
    /// rather than parsed, since its log format isn't a contract this app
    /// can rely on across versions. `None` before it has said anything.
    pub message: Option<String>,
}

pub(crate) struct TunnelConnection {
    child: Arc<Mutex<Child>>,
    handle: Option<JoinHandle<()>>,
    last_line: Arc<Mutex<Option<String>>>,
    /// Flipped by the reader thread the moment `cloudflared`'s stdout pipe
    /// closes — true whether that's because we killed it (`close`, below)
    /// or it crashed on its own. `close` always discards the connection
    /// afterwards, so a deliberate stop never lingers here long enough to
    /// be reported as a failure.
    exited: Arc<AtomicBool>,
}

/// Held on `AppState` behind a `Mutex`, one connector at a time — same
/// shape as `VerificationServerState`/`IndicatorState`.
pub(crate) type TunnelHandleState = Mutex<Option<TunnelConnection>>;

pub(crate) fn new_state() -> TunnelHandleState {
    Mutex::new(None)
}

fn lock(
    state: &TunnelHandleState,
) -> Result<std::sync::MutexGuard<'_, Option<TunnelConnection>>, AppError> {
    state
        .lock()
        .map_err(|_| AppError::Message("tunnel connection lock was poisoned".into()))
}

/// No console window flashing up behind the app when `cloudflared` spawns —
/// desktop polish, not a functional requirement. A no-op on other targets.
#[cfg(windows)]
fn hide_console(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}
#[cfg(not(windows))]
fn hide_console(_command: &mut Command) {}

pub(crate) fn save_token(token: &str) -> Result<(), AppError> {
    let trimmed = token.trim();
    if trimmed.is_empty() {
        return Err(AppError::Message("tunnel token can't be empty".into()));
    }
    security::set_secret(TOKEN_ACCOUNT, trimmed)
}

/// Stops the connector first — it can't keep running once its own
/// credential is gone — then deletes the saved token.
pub(crate) fn clear_token(state: &TunnelHandleState) -> Result<(), AppError> {
    close(state);
    security::delete_secret(TOKEN_ACCOUNT)
}

pub(crate) fn has_token() -> Result<bool, AppError> {
    Ok(security::get_secret(TOKEN_ACCOUNT)?.is_some())
}

/// Stops any existing connector first, same reconnect-friendly shape as
/// `net::open`/`devices::indicator::open`.
pub(crate) fn open(state: &TunnelHandleState) -> Result<TunnelStatus, AppError> {
    close(state);

    let token = security::get_secret(TOKEN_ACCOUNT)?
        .filter(|t| !t.is_empty())
        .ok_or_else(|| {
            AppError::Message("no tunnel token saved — paste one in Settings first".into())
        })?;

    let mut command = Command::new("cloudflared");
    command
        .args(["tunnel", "run"])
        // Passed via the environment rather than `--token <token>` — argv is
        // readable by any other process on the machine for as long as the
        // child runs (Task Manager, `wmic process list full`, etc.), while
        // an env var set on this specific child is not. `cloudflared`
        // documents `TUNNEL_TOKEN` as equivalent to `--token`.
        .env("TUNNEL_TOKEN", &token)
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    hide_console(&mut command);

    let mut child = command.spawn().map_err(|e| {
        AppError::Message(format!(
            "could not start cloudflared: {e} — is it installed and on PATH?"
        ))
    })?;

    let stderr = child.stderr.take();
    let last_line = Arc::new(Mutex::new(None));
    let exited = Arc::new(AtomicBool::new(false));

    let thread_last_line = Arc::clone(&last_line);
    let thread_exited = Arc::clone(&exited);
    let handle = std::thread::spawn(move || {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                if let Ok(mut guard) = thread_last_line.lock() {
                    *guard = Some(line);
                }
            }
        }
        // The loop above only ends once cloudflared's stderr pipe closes —
        // i.e. the process is gone, whether `close` killed it or it exited
        // on its own.
        thread_exited.store(true, Ordering::Relaxed);
    });

    *lock(state)? = Some(TunnelConnection {
        child: Arc::new(Mutex::new(child)),
        handle: Some(handle),
        last_line,
        exited,
    });

    Ok(TunnelStatus {
        state: TunnelState::Running,
        message: None,
    })
}

/// A no-op if nothing is running, so it's always safe to call — same
/// contract as `net::close`/`devices::indicator::close`.
pub(crate) fn close(state: &TunnelHandleState) {
    let Ok(mut guard) = state.lock() else { return };
    if let Some(connection) = guard.take() {
        if let Ok(mut child) = connection.child.lock() {
            let _ = child.kill();
            let _ = child.wait();
        }
        if let Some(handle) = connection.handle {
            let _ = handle.join();
        }
    }
}

pub(crate) fn status(state: &TunnelHandleState) -> Result<TunnelStatus, AppError> {
    let guard = lock(state)?;
    Ok(match guard.as_ref() {
        None => TunnelStatus {
            state: TunnelState::Stopped,
            message: None,
        },
        Some(connection) => {
            let message = connection.last_line.lock().ok().and_then(|g| g.clone());
            let state = if connection.exited.load(Ordering::Relaxed) {
                TunnelState::Failed
            } else {
                TunnelState::Running
            };
            TunnelStatus { state, message }
        }
    })
}
