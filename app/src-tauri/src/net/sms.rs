//! Task #43 — real SMS delivery via a serial-attached GSM modem, using
//! plain AT commands (text mode) over the same `serialport` crate
//! `devices::indicator` already depends on. Unlike the indicator, this
//! holds no persistent connection: a send opens the port, walks the
//! AT+CMGF / AT+CMGS handshake, and closes it again — one blocking round
//! trip per call, the same "no `AppState` connection" shape as
//! `net::email::send`. There's no secret to store here (a GSM modem on a
//! local serial port needs no password), so this module is smaller than
//! `net::email` — no `save_password`/`clear_password`/`has_password`.

use std::io::{Read, Write};
use std::time::{Duration, Instant};

use crate::error::AppError;

const CTRL_Z: u8 = 0x1A;
const RESPONSE_TIMEOUT: Duration = Duration::from_secs(8);
const SEND_TIMEOUT: Duration = Duration::from_secs(20);

/// Reads off `port` until `needle` shows up in the accumulated bytes, an
/// error response (`ERROR`, `+CMS ERROR:`) shows up, or `deadline` passes.
/// Modems are chatty half-duplex devices on this front — command echo,
/// blank lines, an `OK` left over from a prior prompt — so this accumulates
/// into one buffer and searches it, rather than trying to parse a reply
/// line by line the way `devices::indicator`'s continuous read loop does.
fn read_until(
    port: &mut Box<dyn serialport::SerialPort>,
    needle: &str,
    deadline: Instant,
) -> Result<String, AppError> {
    let mut buf = Vec::new();
    let mut chunk = [0u8; 256];
    loop {
        if Instant::now() >= deadline {
            return Err(AppError::Message(format!(
                "modem did not respond in time (waiting for {needle:?})"
            )));
        }
        match port.read(&mut chunk) {
            Ok(0) => continue,
            Ok(n) => {
                buf.extend_from_slice(&chunk[..n]);
                let text = String::from_utf8_lossy(&buf).into_owned();
                if text.contains(needle) {
                    return Ok(text);
                }
                if text.contains("ERROR") {
                    return Err(AppError::Message(format!(
                        "modem reported an error: {}",
                        text.trim()
                    )));
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
            Err(e) => return Err(AppError::Message(format!("serial read failed: {e}"))),
        }
    }
}

fn write_command(
    port: &mut Box<dyn serialport::SerialPort>,
    command: &str,
) -> Result<(), AppError> {
    port.write_all(command.as_bytes())
        .map_err(|e| AppError::Message(format!("serial write failed: {e}")))
}

/// Sends one SMS in text mode, synchronously — the frontend calls this once
/// per outbox row, the same "drain of one" shape `net::email::send` uses
/// (see that module's own doc comment). Opens the port fresh and closes it
/// again on the way out; no connection is held on `AppState`, since a send
/// is a discrete action, not the continuous read stream
/// `devices::indicator` maintains for live weight.
pub(crate) fn send(
    port_name: &str,
    baud_rate: u32,
    to: &str,
    message: &str,
) -> Result<(), AppError> {
    let port_name = port_name.trim();
    let to = to.trim();
    if port_name.is_empty() {
        return Err(AppError::Message(
            "no GSM modem port configured — set one in Settings → Connections first".into(),
        ));
    }
    if to.is_empty() {
        return Err(AppError::Message(
            "party has no phone number saved — add one in Masters first".into(),
        ));
    }

    let mut port = serialport::new(port_name, baud_rate)
        .timeout(Duration::from_millis(500))
        .open()
        .map_err(|e| AppError::Message(format!("could not open {port_name}: {e}")))?;

    // Text mode, not PDU — simpler to build and good enough for the plain
    // GSM-7 ticket summaries this sends (PLAN never calls for Unicode/UCS2
    // SMS, so PDU mode's extra complexity isn't earning its keep here).
    write_command(&mut port, "AT+CMGF=1\r\n")?;
    read_until(&mut port, "OK", Instant::now() + RESPONSE_TIMEOUT)?;

    write_command(&mut port, &format!("AT+CMGS=\"{to}\"\r\n"))?;
    read_until(&mut port, ">", Instant::now() + RESPONSE_TIMEOUT)?;

    // The body plus a lone Ctrl+Z is what tells the modem "that's the whole
    // message, send it now" — no trailing CRLF wanted here, unlike every
    // other AT command above.
    port.write_all(message.as_bytes())
        .map_err(|e| AppError::Message(format!("serial write failed: {e}")))?;
    port.write_all(&[CTRL_Z])
        .map_err(|e| AppError::Message(format!("serial write failed: {e}")))?;

    read_until(&mut port, "+CMGS", Instant::now() + SEND_TIMEOUT)?;

    Ok(())
}
