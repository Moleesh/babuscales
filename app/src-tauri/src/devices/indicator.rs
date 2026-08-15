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
use serde::{Deserialize, Serialize};
use serialport::{DataBits, Parity, StopBits};
use tauri::{AppHandle, Emitter};

use crate::error::AppError;

/// Everything about the wire framing that "just build the Listen button"
/// (task: serial-port indicator settings) turned out to still be missing —
/// data bits/parity/stop bits weren't configurable at all (always the
/// crate's 8-N-1 default), the line terminator was hardcoded to `\n`, and
/// there was no way to handle an indicator that sends its digits reversed.
/// One struct instead of five loose params on `open()` below (Rust has no
/// max-params lint the way `docs/CodingStandards.md`'s ESLint budget does
/// for TS, but five positional `u8`/`String`/`bool`s at a call site is just
/// as easy to transpose by accident). `#[serde(rename_all = "PascalCase")]`
/// matches `docs/CodingStandards.md`'s "JSON config keys: PascalCase" —
/// same convention `ConnectionsConfig` (settingsSchema.ts) already uses for
/// `IndicatorPort`/`IndicatorBaud`/etc, so the frontend can hand this
/// struct the matching slice of `conn` almost verbatim.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct IndicatorFraming {
    pub data_bits: u8,
    /// "none" | "odd" | "even" — case-insensitive.
    pub parity: String,
    pub stop_bits: u8,
    /// "lf" | "cr" | "crlf" — case-insensitive. Whichever is chosen, the
    /// trailing `\r`/`\n` is stripped from every line before it reaches
    /// `parse_weight`, so callers never see the terminator itself.
    pub line_ending: String,
    /// Some indicators transmit a weight's digits least-significant-first
    /// (e.g. 1234 kg as "4321"). When set, `parse_weight` mirrors the
    /// numeric string (sign held in place) before parsing it.
    pub reverse_digits: bool,
}

impl Default for IndicatorFraming {
    /// The crate's own previous hardcoded behaviour — 8-N-1, LF-terminated,
    /// not reversed — so anything that doesn't care can just ask for this.
    fn default() -> Self {
        Self {
            data_bits: 8,
            parity: "none".into(),
            stop_bits: 1,
            line_ending: "lf".into(),
            reverse_digits: false,
        }
    }
}

fn to_data_bits(n: u8) -> Result<DataBits, AppError> {
    match n {
        5 => Ok(DataBits::Five),
        6 => Ok(DataBits::Six),
        7 => Ok(DataBits::Seven),
        8 => Ok(DataBits::Eight),
        other => Err(AppError::Message(format!("unsupported data bits: {other}"))),
    }
}

fn to_parity(s: &str) -> Result<Parity, AppError> {
    match s.to_ascii_lowercase().as_str() {
        "none" => Ok(Parity::None),
        "odd" => Ok(Parity::Odd),
        "even" => Ok(Parity::Even),
        other => Err(AppError::Message(format!("unsupported parity: {other}"))),
    }
}

fn to_stop_bits(n: u8) -> Result<StopBits, AppError> {
    match n {
        1 => Ok(StopBits::One),
        2 => Ok(StopBits::Two),
        other => Err(AppError::Message(format!("unsupported stop bits: {other}"))),
    }
}

/// The byte `read_until` (below) hunts for. CRLF-terminated lines still end
/// in `\n`, so "crlf" and "lf" share the same terminator byte — the
/// leftover `\r` is trimmed off the line afterwards, same as "lf" already
/// tolerates a stray `\r` from a CRLF sender today.
fn terminator_byte(line_ending: &str) -> u8 {
    match line_ending.to_ascii_lowercase().as_str() {
        "cr" => b'\r',
        _ => b'\n',
    }
}

/// Mirrors a numeric string's digits (and decimal point) while keeping a
/// leading sign fixed — "should we reverse the number" from the operator's
/// own report of how some indicators transmit. There's no way to tell from
/// the software side alone whether a given brand reverses the whole numeral
/// (including the decimal point) or just the digit run; the Listen panel
/// (Settings' IndicatorPortMonitor) is how the operator confirms which one
/// their hardware actually needs before flipping this on.
fn reverse_numeric(s: &str) -> String {
    let (sign, rest) = match s.strip_prefix('-') {
        Some(rest) => ("-", rest),
        None => match s.strip_prefix('+') {
            Some(rest) => ("+", rest),
            None => ("", s),
        },
    };
    format!("{sign}{}", rest.chars().rev().collect::<String>())
}

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
pub fn parse_weight(line: &str, pattern: Option<&Regex>, reverse_digits: bool) -> Option<f64> {
    let numeric = if let Some(re) = pattern {
        let caught = re.captures(line)?;
        let group = caught.get(1).or_else(|| caught.get(0))?;
        group.as_str().trim().replace(',', "")
    } else {
        line.chars()
            .filter(|c| c.is_ascii_digit() || *c == '+' || *c == '-' || *c == '.')
            .collect()
    };
    if numeric.is_empty() {
        return None;
    }
    let numeric = if reverse_digits { reverse_numeric(&numeric) } else { numeric };
    numeric.parse::<f64>().ok()
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
    framing: IndicatorFraming,
) -> Result<(), AppError> {
    let compiled = pattern
        .filter(|p| !p.is_empty())
        .map(|p| Regex::new(p).map_err(|e| AppError::Message(format!("invalid pattern: {e}"))))
        .transpose()?;
    let data_bits = to_data_bits(framing.data_bits)?;
    let parity = to_parity(&framing.parity)?;
    let stop_bits = to_stop_bits(framing.stop_bits)?;
    let terminator = terminator_byte(&framing.line_ending);
    let reverse_digits = framing.reverse_digits;

    close(state);

    let port = serialport::new(port_name, baud_rate)
        .timeout(Duration::from_millis(500))
        .data_bits(data_bits)
        .parity(parity)
        .stop_bits(stop_bits)
        .open()
        .map_err(|e| AppError::Message(format!("could not open {port_name}: {e}")))?;

    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop);
    let thread_app = app.clone();
    let handle = std::thread::spawn(move || {
        let mut reader = BufReader::new(port);
        let mut buf: Vec<u8> = Vec::new();
        while !thread_stop.load(Ordering::Relaxed) {
            buf.clear();
            match reader.read_until(terminator, &mut buf) {
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
                    // `from_utf8_lossy` rather than requiring valid UTF-8:
                    // a mid-frame read (right after opening the port) can
                    // land on a partial multi-byte sequence, and a
                    // misconfigured data-bits/parity choice can corrupt
                    // bytes outright — neither should crash the reader
                    // thread, just produce a line that fails to parse.
                    let raw = String::from_utf8_lossy(&buf);
                    let trimmed = raw.trim_end_matches(['\r', '\n']);
                    let _ = thread_app.emit(
                        "indicator-raw-line",
                        RawLinePayload {
                            line: trimmed.to_string(),
                        },
                    );
                    if let Some(weight_kg) = parse_weight(trimmed, compiled.as_ref(), reverse_digits) {
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
