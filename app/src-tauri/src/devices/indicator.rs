//! The real serial-port weight indicator (PLAN §17). One background thread
//! per open connection, reading lines off the wire and emitting a parsed
//! weight sample as a Tauri event per line. The stability gate itself is
//! *not* computed here — it lives in TypeScript
//! (`src/engines/indicator/serialIndicator.ts`), applied with exactly the
//! same two Settings knobs (`ReadingsInRow`, `BandKg`) the simulated
//! indicator already uses, so a real device and the demo mean the same
//! thing by "stable". Rust's job stops at "here is a raw sample".

use std::io::{BufRead, BufReader};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use regex::Regex;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::AppError;

/// One line off the wire, already turned into a weight — PascalCase to
/// match `src/engines/indicator/types.ts`'s `IndicatorReading`, same
/// convention as `store::dto` (see its own doc comment for why).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct RawReading {
    pub weight_kg: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct IndicatorErrorPayload {
    pub message: String,
}

/// One raw line off the wire, verbatim — emitted alongside `RawReading`
/// (below) regardless of whether `parse_weight` could make sense of it.
/// Exists purely for Settings' "Listen" test panel: the operator is
/// figuring out *what* pattern to type into the custom-pattern field, so
/// they need to see the unparsed bytes, not just the readings that already
/// parsed successfully.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct RawLinePayload {
    pub line: String,
}

/// Extracts a signed decimal weight from one line of raw indicator output.
/// `pattern`, if given, is a regex with a capture group around the number —
/// PLAN §17's "custom-pattern fallback so any indicator works without a
/// code change". Without one, this falls back to stripping the line down
/// to `[0-9+\-.]` and parsing what's left — handles the common case of a
/// bare weight ("12470", "+012470.0 kg") but not brands that interleave
/// the number with unrelated digits (a checksum byte, a station ID); those
/// need the custom pattern. Pure and hardware-free — the one part of this
/// module actually exercised in this environment, the same way the store's
/// own logic was: a throwaway `cargo run --example`, deleted once it
/// passed (app/README.md documents what that run covered).
pub fn parse_weight(line: &str, pattern: Option<&Regex>) -> Option<f64> {
    if let Some(re) = pattern {
        let caught = re.captures(line)?;
        let group = caught.get(1).or_else(|| caught.get(0))?;
        return group.as_str().trim().replace(',', "").parse::<f64>().ok();
    }
    let stripped: String = line
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '+' || *c == '-' || *c == '.')
        .collect();
    if stripped.is_empty() {
        return None;
    }
    stripped.parse::<f64>().ok()
}

// Everything below is `pub(crate)`, not `pub` — this connection handle is
// internal plumbing between `commands::indicator` and `state.rs`, never
// meant to cross the crate boundary the way `store`'s DTOs do (this crate
// also builds as a staticlib/cdylib for the mobile targets — PLAN §21
// Phase 8 — so an accidental `pub` here would be a real, if harmless,
// public API surface).
pub(crate) struct IndicatorConnection {
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

/// Held on `AppState` behind a `Mutex`, one connection at a time — same
/// "one thing every command shares" shape as the database connection
/// (`state.rs`'s own comment).
pub(crate) type IndicatorState = Mutex<Option<IndicatorConnection>>;

pub(crate) fn new_state() -> IndicatorState {
    Mutex::new(None)
}

/// Real, testable without hardware: even zero ports back is a correct
/// result (a machine with nothing plugged in), not a stub.
pub fn list_ports() -> Result<Vec<String>, AppError> {
    Ok(serialport::available_ports()
        .map_err(|e| AppError::Message(format!("could not list serial ports: {e}")))?
        .into_iter()
        .map(|p| p.port_name)
        .collect())
}

fn lock(
    state: &IndicatorState,
) -> Result<std::sync::MutexGuard<'_, Option<IndicatorConnection>>, AppError> {
    state
        .lock()
        .map_err(|_| AppError::Message("indicator connection lock was poisoned".into()))
}

/// Stops any existing connection first (reconnecting after a settings
/// change — a new baud rate on the same port — doesn't require the
/// operator to press Disconnect first, and Windows won't grant a second
/// handle to a COM port that's still open), then opens the new one and
/// hands it to a dedicated reader thread. Nothing outside that thread
/// touches the port again until `close` stops it.
pub(crate) fn open(
    app: &AppHandle,
    state: &IndicatorState,
    port_name: &str,
    baud_rate: u32,
    pattern: Option<&str>,
) -> Result<(), AppError> {
    let compiled = pattern
        .filter(|p| !p.is_empty())
        .map(|p| Regex::new(p).map_err(|e| AppError::Message(format!("invalid pattern: {e}"))))
        .transpose()?;

    close(state);

    let port = serialport::new(port_name, baud_rate)
        .timeout(Duration::from_millis(500))
        .open()
        .map_err(|e| AppError::Message(format!("could not open {port_name}: {e}")))?;

    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop);
    let thread_app = app.clone();
    let handle = std::thread::spawn(move || {
        let mut reader = BufReader::new(port);
        let mut line = String::new();
        while !thread_stop.load(Ordering::Relaxed) {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => {
                    // A real EOF on a serial port means it went away —
                    // unplugged, or the OS reclaimed it. Not a timeout.
                    let _ = thread_app.emit(
                        "indicator-error",
                        IndicatorErrorPayload {
                            message: "the port closed".into(),
                        },
                    );
                    break;
                }
                Ok(_) => {
                    let trimmed = line.trim_end();
                    let _ = thread_app.emit(
                        "indicator-raw-line",
                        RawLinePayload {
                            line: trimmed.to_string(),
                        },
                    );
                    if let Some(weight_kg) = parse_weight(trimmed, compiled.as_ref()) {
                        let _ = thread_app.emit("indicator-reading", RawReading { weight_kg });
                    }
                    // A line that doesn't parse is dropped silently —
                    // expected right after opening a port (mid-frame
                    // garbage, a partial line) and not worth surfacing as
                    // an error on every single occurrence.
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
                Err(e) => {
                    let _ = thread_app.emit(
                        "indicator-error",
                        IndicatorErrorPayload {
                            message: e.to_string(),
                        },
                    );
                    break;
                }
            }
        }
    });

    *lock(state)? = Some(IndicatorConnection {
        stop,
        handle: Some(handle),
    });
    Ok(())
}

/// Stops the reader thread (it wakes at most every 500ms — the read
/// timeout above — to check the stop flag, so this returns promptly) and
/// drops the port, closing it. A no-op if nothing is connected, so it's
/// always safe to call, including from `open` above.
pub(crate) fn close(state: &IndicatorState) {
    let Ok(mut guard) = state.lock() else { return };
    if let Some(mut connection) = guard.take() {
        connection.stop.store(true, Ordering::Relaxed);
        if let Some(handle) = connection.handle.take() {
            let _ = handle.join();
        }
    }
}
