//! The real serial-port weight indicator (PLAN §17). One background thread
//! per open connection, reading lines off the wire and emitting a parsed
//! weight sample as a Tauri event per line. The stability gate itself is
//! *not* computed here — it lives in TypeScript
//! (`src/engines/indicator/serialIndicator.ts`), applied with exactly the
//! same two Settings knobs (`ReadingsInRow`, `BandKg`) the simulated
//! indicator already uses, so a real device and the demo mean the same
//! thing by "stable". Rust's job stops at "here is a raw sample".

use std::io::{BufRead, BufReader, Read};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use regex::Regex;
use serde::{Deserialize, Serialize};
use serialport::{DataBits, Parity, StopBits};
use tauri::{AppHandle, Emitter};

use crate::error::AppError;

/// Hard cap on how many bytes one `read_until` attempt will consume while
/// looking for `framing.line_ending` before giving up on that "line" and
/// trying again — see the reader thread's own comment (`open`, below) for
/// the hang this guards against. Picked from the operator's own report of
/// what a stuck Listen panel looked like in production (a garbled block
/// several hundred characters/~20 terminal rows deep with no valid
/// reading in it); anywhere in the "clearly not one real line anymore"
/// range would do.
const MAX_LINE_BYTES: usize = 400;

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
    /// The line terminator, as its raw decimal byte value — 10 (the
    /// default) is `\n`/LF, 13 is `\r`/CR. A plain number instead of an
    /// LF/CR/CRLF picker: `read_until` (below) always reads up to this
    /// byte, and both this byte and any leftover `\r`/`\n` are stripped
    /// from the line before it reaches `parse_weight`, so a CRLF sender
    /// still works unchanged with the default 10 — callers never see the
    /// terminator itself either way.
    pub line_ending: u8,
    /// Some indicators transmit a weight's digits least-significant-first
    /// (e.g. 1234 kg as "4321"). When set, `parse_weight` mirrors the
    /// numeric string (sign held in place) before parsing it.
    pub reverse_digits: bool,
    /// Simpler alternative to `pattern` (Custom pattern (advanced), the
    /// regex) for the common "the weight sits between two marker
    /// characters" case — e.g. STX/ETX-wrapped output, or a line like
    /// `W:012340kg` where `:`/`k` bound the number. Empty = no bound on
    /// that side. Ignored entirely when `pattern` is set.
    #[serde(default)]
    pub start_char: String,
    #[serde(default)]
    pub end_char: String,
}

impl Default for IndicatorFraming {
    /// The crate's own previous hardcoded behaviour — 8-N-1, LF-terminated,
    /// not reversed, no start/end markers — so anything that doesn't care
    /// can just ask for this.
    fn default() -> Self {
        Self {
            data_bits: 8,
            parity: "none".into(),
            stop_bits: 1,
            line_ending: 10,
            reverse_digits: false,
            start_char: String::new(),
            end_char: String::new(),
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

/// Mirrors a numeric string's digits (and decimal point) while keeping a
/// leading sign fixed — "should we reverse the number" from the operator's
/// own report of how some indicators transmit. There's no way to tell from
/// the software side alone whether a given brand reverses the whole numeral
/// (including the decimal point) or just the digit run; the Listen panel
/// (Settings' IndicatorPortMonitor) is how the operator confirms which one
/// their hardware actually needs before flipping this on.
/// Trims `line` to the substring between the first `start_char` and the
/// first `end_char` found after it — the plain-English "start char / end
/// char" the operator asked for as a less-fiddly alternative to a regex.
/// Either side left empty (the common case — most indicators need neither)
/// is simply not applied on that side. Not found means "give up bounding
/// on that side", not "no number" — the unbounded numeric-extraction
/// fallback (right after this runs, in `parse_weight`) still gets a
/// chance to find digits in whatever's left, same as today's plain lines.
fn scope_between<'a>(line: &'a str, start_char: &str, end_char: &str) -> &'a str {
    let mut scoped = line;
    if let Some(start) = start_char.chars().next() {
        if let Some(idx) = scoped.find(start) {
            scoped = &scoped[idx + start.len_utf8()..];
        }
    }
    if let Some(end) = end_char.chars().next() {
        if let Some(idx) = scoped.find(end) {
            scoped = &scoped[..idx];
        }
    }
    scoped
}

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

/// Emitted instead of `RawLinePayload`/`RawReading` whenever a "line" runs
/// past `MAX_LINE_BYTES` without ever hitting `framing.line_ending` — a
/// misconfigured/no-terminator indicator (production report: a scale
/// streaming `73850kg-74630kg-...` continuously, no LF anywhere) that would
/// otherwise make `read_until` below block forever, one endless "line",
/// with nothing ever reaching the frontend. Settings' Listen panel
/// (IndicatorPortMonitor.tsx) turns this into a popup pointing the operator
/// at the Line ending field instead of just sitting on "No data yet"
/// forever with no explanation.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct OverflowPayload {
    pub bytes: usize,
}

/// Extracts a signed decimal weight from one line of raw indicator output.
/// `pattern`, if given, is a regex with a capture group around the number —
/// PLAN §17's "custom-pattern fallback so any indicator works without a
/// code change", and takes priority over `framing.start_char`/`end_char`
/// when both are set (the regex already says exactly what to keep).
/// Without a pattern, `start_char`/`end_char` first narrow the line to the
/// substring between those markers (see `scope_between`), then — with or
/// without that narrowing — this always strips whatever's left down to
/// `[0-9+\-.]` before parsing ("always clean the input for number, remove
/// unwanted char"): handles the common case of a bare weight ("12470",
/// "+012470.0 kg") even when start/end char narrowed to something like
/// "012340kg". Pure and hardware-free — the one part of this module
/// actually exercised in this environment, the same way the store's own
/// logic was: a throwaway `cargo run --example`, deleted once it passed
/// (app/README.md documents what that run covered).
pub fn parse_weight(line: &str, pattern: Option<&Regex>, framing: &IndicatorFraming) -> Option<f64> {
    let numeric = if let Some(re) = pattern {
        let caught = re.captures(line)?;
        let group = caught.get(1).or_else(|| caught.get(0))?;
        group.as_str().trim().replace(',', "")
    } else {
        scope_between(line, &framing.start_char, &framing.end_char)
            .chars()
            .filter(|c| c.is_ascii_digit() || *c == '+' || *c == '-' || *c == '.')
            .collect()
    };
    if numeric.is_empty() {
        return None;
    }
    let numeric = if framing.reverse_digits { reverse_numeric(&numeric) } else { numeric };
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
    let terminator = framing.line_ending;

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
            // Bug: a device with no real line terminator (production
            // report: a scale streaming `73850kg-74630kg-...` forever, no
            // LF anywhere) made a bare `read_until` block indefinitely —
            // data kept arriving, so it never timed out either, just grew
            // `buf` without end and never returned. Wrapping the reader in
            // a fresh `Take` every iteration caps how many bytes this one
            // "line" attempt can consume before giving up and trying
            // again, the same way the 500ms read timeout below already
            // bounds a single stalled read. `(&mut reader).take(..)`
            // borrows rather than consumes `reader`, so the *next*
            // iteration still starts from wherever this one left off.
            let mut limited = (&mut reader).take(MAX_LINE_BYTES as u64);
            match limited.read_until(terminator, &mut buf) {
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
                Ok(_) if buf.last() != Some(&terminator) => {
                    // Hit the `MAX_LINE_BYTES` cap without ever seeing the
                    // configured terminator — this is the "no real line
                    // ending" case, not a normal line. Surface it as its
                    // own event (not `indicator-error`, which the Listen
                    // panel already renders as a single inline `⚠ ...`
                    // line) so the UI can pop something the operator can't
                    // miss, then keep the connection open and try again —
                    // reconnecting shouldn't be required just to test a
                    // different Line ending value.
                    let _ = thread_app.emit("indicator-overflow", OverflowPayload { bytes: buf.len() });
                }
                Ok(_) => {
                    // `from_utf8_lossy` rather than requiring valid UTF-8:
                    // a mid-frame read (right after opening the port) can
                    // land on a partial multi-byte sequence, and a
                    // misconfigured data-bits/parity choice can corrupt
                    // bytes outright — neither should crash the reader
                    // thread, just produce a line that fails to parse.
                    let raw = String::from_utf8_lossy(&buf);
                    // Trim '\r'/'\n' unconditionally (covers a CRLF sender
                    // even though `terminator` is a single byte), plus
                    // whatever custom byte was actually configured — it
                    // won't already be one of the two above whenever it
                    // isn't 10 or 13.
                    let trimmed = raw.trim_end_matches(['\r', '\n', terminator as char]);
                    let _ = thread_app.emit(
                        "indicator-raw-line",
                        RawLinePayload {
                            line: trimmed.to_string(),
                        },
                    );
                    if let Some(weight_kg) = parse_weight(trimmed, compiled.as_ref(), &framing) {
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
