//! The LAN server (off by default) that lets a phone on the same network
//! reach this machine's data — PLAN §4.10. Authenticated, and bounded to
//! the local subnet; never exposed beyond it from here.
//!
//! The first (and so far only) tenant is QR verification (PLAN §18):
//! "every ticket carries a QR resolving to a page showing the authentic
//! weighment... making forged slips worthless." §23 item 6 settled the
//! hosting question as LAN-only, sharable by URL — a public option rides
//! on top of this same server via an opt-in Cloudflare Tunnel, not a
//! second server (see the Remote access task, PLAN §18's "Remote access —
//! Cloudflare Tunnel" spec).
//!
//! One blocking `tiny_http` server on a dedicated thread — not tokio/axum —
//! same "smallest footprint that does the job" call as the rest of the
//! Rust core (PLAN §5's <15% budget). Started and stopped by
//! `commands::net`, driven from Settings' Integrations → "QR verification
//! page" toggle exactly the way `devices::indicator::open`/`close` are
//! driven by the Connections pane — see that module's own doc comment for
//! the shared "one background thread, a stop flag it polls" shape this
//! copies.

pub mod board;
pub mod email;
pub mod sms;
pub mod tally;
pub mod tunnel;
pub mod webhook;

use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use serde::Serialize;
use serde_json::Value as Json;
use tauri::{AppHandle, Manager};
use tiny_http::{Header, Response, Server, StatusCode};

use crate::error::AppError;
use crate::state::AppState;
use crate::store;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct VerificationServerStatus {
    pub port: u16,
    /// `None` when no outward-facing network route could be resolved (e.g.
    /// offline) — the server is still up and reachable at `loopback_url`.
    pub lan_url: Option<String>,
    pub loopback_url: String,
}

pub(crate) struct VerificationServerConnection {
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
    status: VerificationServerStatus,
}

/// Held on `AppState` behind a `Mutex`, one server at a time — same shape
/// as `devices::indicator::IndicatorState`.
pub(crate) type VerificationServerState = Mutex<Option<VerificationServerConnection>>;

pub(crate) fn new_state() -> VerificationServerState {
    Mutex::new(None)
}

fn lock(
    state: &VerificationServerState,
) -> Result<std::sync::MutexGuard<'_, Option<VerificationServerConnection>>, AppError> {
    state
        .lock()
        .map_err(|_| AppError::Message("verification server lock was poisoned".into()))
}

/// The trick that avoids a dependency for this: connecting a UDP socket
/// never actually sends a packet, it only asks the OS to resolve which
/// local interface would carry traffic to that destination — so this
/// returns this machine's real LAN-facing address without touching the
/// network, and without knowing the LAN's shape up front (router IP,
/// subnet, VPN interfaces...).
fn local_lan_ip() -> Option<std::net::IpAddr> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip())
}

/// Stops any existing server first, same reconnect-friendly shape as
/// `devices::indicator::open` — flipping the Settings toggle off and back
/// on doesn't require a manual stop first, and the OS won't grant a second
/// listener on the same port while the old one is still bound.
pub(crate) fn open(
    app: &AppHandle,
    state: &VerificationServerState,
    port: u16,
) -> Result<VerificationServerStatus, AppError> {
    close(state);

    let server = Server::http(("0.0.0.0", port))
        .map_err(|e| AppError::Message(format!("could not start verification server: {e}")))?;
    let bound_port = server
        .server_addr()
        .to_ip()
        .map(|addr| addr.port())
        .unwrap_or(port);
    let lan_url = local_lan_ip().map(|ip| format!("http://{ip}:{bound_port}"));
    let loopback_url = format!("http://127.0.0.1:{bound_port}");
    let status = VerificationServerStatus {
        port: bound_port,
        lan_url,
        loopback_url,
    };

    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop);
    let thread_app = app.clone();
    let handle = std::thread::spawn(move || {
        while !thread_stop.load(Ordering::Relaxed) {
            // Bounded wait, same as the indicator's serial read timeout —
            // wakes at most every 500ms to recheck the stop flag, so
            // `close` below returns promptly instead of blocking on the
            // next request that may never arrive.
            match server.recv_timeout(Duration::from_millis(500)) {
                Ok(Some(request)) => handle_request(&thread_app, request),
                Ok(None) => continue,
                Err(_) => break,
            }
        }
    });

    *lock(state)? = Some(VerificationServerConnection {
        stop,
        handle: Some(handle),
        status: status.clone(),
    });
    Ok(status)
}

/// A no-op if nothing is running, so it's always safe to call — same
/// contract as `devices::indicator::close`.
pub(crate) fn close(state: &VerificationServerState) {
    let Ok(mut guard) = state.lock() else { return };
    if let Some(mut connection) = guard.take() {
        connection.stop.store(true, Ordering::Relaxed);
        if let Some(handle) = connection.handle.take() {
            let _ = handle.join();
        }
    }
}

pub(crate) fn status(
    state: &VerificationServerState,
) -> Result<Option<VerificationServerStatus>, AppError> {
    Ok(lock(state)?.as_ref().map(|c| c.status.clone()))
}

fn handle_request(app: &AppHandle, request: tiny_http::Request) {
    let url = request.url().to_string();
    let response = route(app, &url);
    let _ = request.respond(response);
}

fn html_response(status: StatusCode, body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    Response::from_string(body)
        .with_status_code(status)
        .with_header(
            Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..])
                .expect("static header is always valid"),
        )
}

fn route(app: &AppHandle, url: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let path = url.split('?').next().unwrap_or(url);
    let segments: Vec<&str> = path.trim_matches('/').split('/').collect();

    match segments.as_slice() {
        [""] => html_response(StatusCode(200), landing_page()),
        ["v", doc_id] => verification_page(app, doc_id),
        ["v", doc_id, "asset", asset_id] => asset_response(app, doc_id, asset_id),
        _ => html_response(StatusCode(404), error_page("Not found", "Nothing here.")),
    }
}

fn landing_page() -> String {
    page_shell(
        "BabuScales verification",
        r#"<p class="lede">This is a BabuScales weighbridge's ticket verification service.</p>
           <p>Scan the QR code printed on a ticket to see its verified weighment.</p>"#,
    )
}

fn error_page(title: &str, body: &str) -> String {
    page_shell(
        title,
        &format!("<p class=\"lede\">{}</p>", escape_html(body)),
    )
}

fn asset_response(
    app: &AppHandle,
    doc_id: &str,
    asset_id: &str,
) -> Response<std::io::Cursor<Vec<u8>>> {
    let state = app.state::<AppState>();
    let Ok(conn) = crate::state::lock(&state) else {
        return html_response(
            StatusCode(500),
            error_page("Error", "Database unavailable."),
        );
    };

    // The asset must actually be referenced by this ticket's own captures —
    // a bare asset_id lookup would let anyone on the LAN pull any photo in
    // the database by guessing ids, not just the ones a printed QR code
    // legitimately points at.
    let Ok(Some(doc)) = store::get_doc(&conn, doc_id) else {
        return html_response(StatusCode(404), error_page("Not found", "No such ticket."));
    };
    if !ticket_references_asset(&doc.body, asset_id) {
        return html_response(StatusCode(404), error_page("Not found", "No such photo."));
    }

    let Ok(Some(meta)) = store::get_asset_meta(&conn, asset_id) else {
        return html_response(StatusCode(404), error_page("Not found", "No such photo."));
    };
    let Ok(Some(bytes)) = store::get_asset_bytes(&conn, asset_id) else {
        return html_response(StatusCode(404), error_page("Not found", "No such photo."));
    };

    Response::from_data(bytes).with_header(
        Header::from_bytes(&b"Content-Type"[..], meta.mime_type.as_bytes()).unwrap_or_else(|_| {
            Header::from_bytes(&b"Content-Type"[..], &b"application/octet-stream"[..])
                .expect("static header is always valid")
        }),
    )
}

fn ticket_references_asset(body: &Json, asset_id: &str) -> bool {
    body.get("Captures")
        .and_then(|c| c.as_array())
        .map(|captures| {
            captures.iter().any(|capture| {
                capture
                    .get("Images")
                    .and_then(|images| images.as_array())
                    .map(|images| images.iter().any(|img| img.as_str() == Some(asset_id)))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

fn verification_page(app: &AppHandle, doc_id: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let state = app.state::<AppState>();
    let Ok(conn) = crate::state::lock(&state) else {
        return html_response(
            StatusCode(500),
            error_page("Error", "Database unavailable."),
        );
    };

    let doc = match store::get_doc(&conn, doc_id) {
        Ok(Some(doc)) if doc.doc_kind == "Ticket" => doc,
        Ok(_) => {
            return html_response(
                StatusCode(404),
                error_page(
                    "Ticket not found",
                    "This QR code doesn't match any ticket on this machine. It may be from a \
                     different weighbridge, or the ticket was printed but never saved.",
                ),
            )
        }
        Err(_) => return html_response(StatusCode(500), error_page("Error", "Database error.")),
    };

    let chain = store::verify_chain(&conn).unwrap_or(store::dto::ChainVerification {
        intact: false,
        checked: 0,
        broken_at: None,
    });
    let body_intact = store::body_matches_hash(&doc.body, &doc.body_hash);
    let verified = chain.intact && body_intact;

    html_response(StatusCode(200), render_ticket(&doc, verified, &chain))
}

fn render_ticket(
    doc: &store::dto::DocRow,
    verified: bool,
    chain: &store::dto::ChainVerification,
) -> String {
    let body = &doc.body;
    let field = |key: &str| -> String {
        body.get(key)
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(escape_html)
            .unwrap_or_else(|| "—".to_string())
    };

    let captures = body
        .get("Captures")
        .and_then(|c| c.as_array())
        .cloned()
        .unwrap_or_default();
    let capture_kg = |kind: &str| -> Option<f64> {
        captures
            .iter()
            .find(|c| c.get("Type").and_then(|t| t.as_str()) == Some(kind))
            .and_then(|c| c.get("WeightKg"))
            .and_then(|w| w.as_f64())
    };
    let tare_kg = capture_kg("Tare");
    let gross_kg = capture_kg("Gross");
    let net_kg = match (tare_kg, gross_kg) {
        (Some(t), Some(g)) => Some((g - t).abs()),
        _ => None,
    };
    let fmt_kg = |v: Option<f64>| {
        v.map(|v| format!("{v:.0} kg"))
            .unwrap_or_else(|| "—".into())
    };

    let photos: Vec<String> = captures
        .iter()
        .flat_map(|c| {
            c.get("Images")
                .and_then(|i| i.as_array())
                .cloned()
                .unwrap_or_default()
        })
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();
    let photos_html = if photos.is_empty() {
        String::new()
    } else {
        let imgs: String = photos
            .iter()
            .map(|asset_id| {
                format!(
                    r#"<img class="photo" src="/v/{doc_id}/asset/{asset_id}" alt="Weighment photo">"#,
                    doc_id = escape_html(&doc.doc_id),
                    asset_id = escape_html(asset_id),
                )
            })
            .collect();
        format!(r#"<div class="photos">{imgs}</div>"#)
    };

    let (badge_class, badge_text, badge_detail) = if doc.is_cancelled {
        (
            "badge-cancelled",
            "Cancelled",
            "This ticket was cancelled and is not a valid weighment record.".to_string(),
        )
    } else if verified {
        (
            "badge-ok",
            "Verified",
            format!(
                "This ticket's record and its {} entries in this machine's audit trail are unaltered.",
                chain.checked
            ),
        )
    } else {
        (
            "badge-bad",
            "Could not verify",
            "This ticket's data or this machine's audit trail does not match what was \
             originally recorded. Treat this slip as unverified."
                .to_string(),
        )
    };

    let ticket_no = doc
        .doc_seq
        .map(|n| n.to_string())
        .unwrap_or_else(|| "—".to_string());

    page_shell(
        &format!("Ticket #{ticket_no} — BabuScales verification"),
        &format!(
            r#"
            <div class="badge {badge_class}">{badge_text}</div>
            <p class="detail">{badge_detail}</p>
            <table class="facts">
                <tr><th>Ticket</th><td>#{ticket_no}</td></tr>
                <tr><th>Vehicle</th><td>{vehicle}</td></tr>
                <tr><th>Party</th><td>{party}</td></tr>
                <tr><th>Material</th><td>{material}</td></tr>
                <tr><th>Date</th><td>{created}</td></tr>
                <tr><th>Tare</th><td>{tare}</td></tr>
                <tr><th>Gross</th><td>{gross}</td></tr>
                <tr><th>Net</th><td>{net}</td></tr>
            </table>
            {photos_html}
            <p class="fine">Ticket ID {doc_id} · verified against this weighbridge's local
            record at the moment this page was requested.</p>
            "#,
            vehicle = field("VehicleNo"),
            party = field("Party"),
            material = field("Material"),
            created = escape_html(&doc.created_at),
            tare = fmt_kg(tare_kg),
            gross = fmt_kg(gross_kg),
            net = fmt_kg(net_kg),
            doc_id = escape_html(&doc.doc_id),
        ),
    )
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// One inline stylesheet, no external requests — this page has to render
/// correctly on a phone that scanned a QR code with no other context, off
/// whatever this LAN server serves and nothing else (PLAN §18).
fn page_shell(title: &str, body: &str) -> String {
    format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 480px; margin: 0 auto; padding: 24px 16px 48px;
    color: #1a1f27; background: #f6f7f9;
  }}
  .brand {{ font-weight: 800; letter-spacing: -0.01em; margin-bottom: 20px; }}
  .brand em {{ font-style: normal; color: #0b5fbf; }}
  .badge {{
    display: inline-block; font-weight: 700; font-size: 1.05rem;
    padding: 8px 14px; border-radius: 999px; margin-bottom: 8px;
  }}
  .badge-ok {{ background: #dbf5e6; color: #0f7a3d; }}
  .badge-bad {{ background: #fbdede; color: #a11313; }}
  .badge-cancelled {{ background: #eee; color: #666; }}
  .detail {{ color: #555; font-size: 0.9rem; margin: 0 0 20px; }}
  .lede {{ font-size: 1rem; color: #333; }}
  table.facts {{ width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }}
  table.facts th, table.facts td {{ text-align: left; padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 0.92rem; }}
  table.facts th {{ color: #777; font-weight: 600; width: 40%; }}
  table.facts tr:last-child th, table.facts tr:last-child td {{ border-bottom: none; }}
  .photos {{ display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }}
  .photo {{ max-width: 100%; border-radius: 8px; }}
  .fine {{ color: #999; font-size: 0.78rem; margin-top: 20px; }}
  @media (prefers-color-scheme: dark) {{
    body {{ background: #14181f; color: #e7e9ec; }}
    table.facts {{ background: #1c212b; box-shadow: none; }}
    table.facts th, table.facts td {{ border-bottom-color: #2a303c; }}
    .lede {{ color: #cfd3d9; }}
  }}
</style>
</head>
<body>
  <div class="brand">Babu<em>Scales</em></div>
  {body}
</body>
</html>"#
    )
}
