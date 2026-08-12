//! Real delivery for Settings' Integrations → "Webhook / REST" channel — see
//! the outbox-worker task's own PLAN entry. One blocking POST per outbox
//! row, same "no persistent connection, no `AppState`" shape as
//! `net::email::send`/`net::sms::send`: a webhook fires once when the
//! worker drains a row and stops, it doesn't hold a socket open.
//!
//! Retry/backoff is entirely the TypeScript worker's job
//! (`useOutboxWorker.ts`) — this function makes exactly one attempt and
//! reports success or failure, the same contract `net::email::send` and
//! `net::sms::send` already keep.

use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::error::AppError;

type HmacSha256 = Hmac<Sha256>;

const REQUEST_TIMEOUT_SECS: u64 = 10;

/// Hex-encoded HMAC-SHA256 of `payload_json` under `secret` — sent as
/// `X-BabuScales-Signature` so the receiving endpoint can verify this
/// request actually came from this machine's configured secret, not just
/// anyone who found the URL.
fn sign(secret: &str, payload_json: &str) -> Result<String, AppError> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| AppError::Message(format!("could not initialise HMAC: {e}")))?;
    mac.update(payload_json.as_bytes());
    Ok(hex::encode(mac.finalize().into_bytes()))
}

/// Posts `payload_json` to `endpoint` as `application/json`, synchronously.
/// Signs the body (see [`sign`]) when `secret` is non-empty; sends unsigned
/// otherwise — same "empty means off/skip" convention as every other
/// optional field in `settingsSchema.ts`. A non-2xx response or a
/// connection failure is an `Err`; this never retries internally.
pub(crate) fn send(endpoint: &str, secret: &str, payload_json: &str) -> Result<(), AppError> {
    let endpoint = endpoint.trim();
    if endpoint.is_empty() {
        return Err(AppError::Message(
            "no webhook endpoint configured — set one in Settings → Connections first".into(),
        ));
    }

    let mut request = ureq::post(endpoint)
        .set("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECS));

    if !secret.is_empty() {
        let signature = sign(secret, payload_json)?;
        request = request.set("X-BabuScales-Signature", &signature);
    }

    request
        .send_string(payload_json)
        .map_err(|e| AppError::Message(format!("webhook POST failed: {e}")))?;

    Ok(())
}
