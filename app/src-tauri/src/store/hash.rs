//! Mirrors `src/db/hash.ts` exactly, so the same body hashed by the memory
//! adapter and by this one produces the same digest. `serde_json::Value`'s
//! `Object` variant is a `BTreeMap` by default (no `preserve_order` feature
//! turned on in Cargo.toml) — every nesting level already serialises with
//! its keys sorted, which is exactly what the TS side's manual
//! `canonicalize()` does by hand. No separate canonicalisation step needed
//! here.

use sha2::{Digest, Sha256};

use crate::error::AppError;

pub fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|b| format!("{b:02x}")).collect()
}

/// `body_hash` — PLAN §6.1: "hash of CURRENT body, not a chain."
pub fn hash_body(body: &serde_json::Value) -> Result<String, AppError> {
    let json = serde_json::to_string(body).map_err(|e| AppError::Message(e.to_string()))?;
    Ok(sha256_hex(json.as_bytes()))
}

/// True if a doc's current `body` still hashes to its stored `body_hash` —
/// the other half of the QR verification page's trust badge alongside
/// `audit::verify_chain` (net/mod.rs): this catches the row itself having
/// been altered outside the app (direct file edit), the chain catches an
/// audit entry being altered.
pub fn body_matches_hash(body: &serde_json::Value, stored_hash: &str) -> bool {
    hash_body(body)
        .map(|recomputed| recomputed == stored_hash)
        .unwrap_or(false)
}

/// One link in the `audit` hash chain — mixes the previous row's hash into
/// this row's content so altering any past entry breaks every hash after it.
pub fn hash_audit_row(
    content: &serde_json::Value,
    prev_hash: Option<&str>,
) -> Result<String, AppError> {
    let json = serde_json::to_string(content).map_err(|e| AppError::Message(e.to_string()))?;
    Ok(sha256_hex(
        format!("{json}|{}", prev_hash.unwrap_or("")).as_bytes(),
    ))
}
