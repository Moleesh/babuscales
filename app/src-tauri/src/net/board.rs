//! Real delivery for Settings' Integrations → "Outdoor display board"
//! channel — the simplest possible wire protocol that still counts as a
//! real integration: one line of plain text over a raw TCP socket,
//! terminated with `\n`. No binary/proprietary board protocol is invented
//! here (out of scope for the outbox-worker task this module belongs to);
//! a site whose board needs something fancier gets its own protocol module
//! later, same as `net::tally`'s CSV-only scope note.
//!
//! Same "no persistent connection" shape as the other `net::*` senders:
//! connect, write, close, once per outbox row — never a long-lived socket
//! held on `AppState`.

use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

use crate::error::AppError;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(3);
const WRITE_TIMEOUT: Duration = Duration::from_secs(3);

/// Opens a TCP connection to `host:port`, writes `text` followed by a
/// newline, then closes — a bounded connect timeout (matching
/// `net::sms`'s `RESPONSE_TIMEOUT`/`SEND_TIMEOUT` style of never blocking
/// forever on a device that may not be there) rather than the OS default,
/// which can take far longer than is useful for a display board on the
/// same LAN.
pub(crate) fn send_line(host: &str, port: u16, text: &str) -> Result<(), AppError> {
    let host = host.trim();
    if host.is_empty() {
        return Err(AppError::Message(
            "no display board host configured — set one in Settings → Connections first".into(),
        ));
    }

    let addr = format!("{host}:{port}");
    let mut socket = addr
        .to_socket_addrs()
        .ok()
        .and_then(|mut addrs| addrs.next())
        .ok_or_else(|| AppError::Message(format!("could not resolve display board address {addr}")))
        .and_then(|socket_addr| {
            TcpStream::connect_timeout(&socket_addr, CONNECT_TIMEOUT)
                .map_err(|e| AppError::Message(format!("could not connect to {addr}: {e}")))
        })?;

    socket
        .set_write_timeout(Some(WRITE_TIMEOUT))
        .map_err(|e| AppError::Message(format!("could not set write timeout: {e}")))?;

    socket
        .write_all(text.as_bytes())
        .and_then(|_| socket.write_all(b"\n"))
        .map_err(|e| AppError::Message(format!("could not write to display board: {e}")))?;

    Ok(())
}
