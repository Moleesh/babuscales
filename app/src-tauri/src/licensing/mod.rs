//! Licence, trial and expiry (PLAN §4.10, §12's "recovery procedure tied to
//! the licence", §23 item 4). Wire format, base32 codes and Ed25519
//! verification all live in the sibling `license-format` crate — this
//! module is everything that crate deliberately doesn't know: the current
//! machine's identity, what "now" is, and how those combine with a decoded
//! [`license_format::LicensePayload`] into one of the states below.
//!
//! **Not built here:** anywhere this state actually changes what the
//! operator can do — Settings' System pane, and the app-wide read-only
//! gate a lapsed trial should trigger — is task #38's "activation UI +
//! trial gating", not this one. This task is the engine and its Tauri
//! commands; #38 is the dashboard light wired to it.
//!
//! **Trial length is a placeholder pending a real decision**
//! (PLAN §23 item 4, "pricing and licence tiers" — still open): 14 days,
//! matching the number floated for task #38 but never confirmed. Changing
//! [`TRIAL_DAYS`] is the whole blast radius when that's settled.

use std::path::Path;

use chrono::NaiveDate;
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::error::AppError;

/// Placeholder pending PLAN §23 item 4 (see this module's own doc comment).
pub const TRIAL_DAYS: i64 = 14;

/// Reads this installation's stable identifier and hashes it down to the
/// `u64` that both a request code and an activation code carry. Hashing
/// rather than embedding the raw ID means a request code never leaks the
/// underlying identifier to whoever reads it in transit — only Babulens'
/// signed reply, bound to that hash, matters to this app.
///
/// `app_data_dir` is only read on the [`raw_machine_id`] fallback path
/// (task #49, Android) — Windows's real ID comes from the registry and
/// ignores it, but every caller has one on hand already (task #6's own
/// `app.path().app_data_dir()`), so there's no reason to make it optional.
pub fn machine_id_hash(app_data_dir: &Path) -> Result<u64, AppError> {
    let raw = raw_machine_id(app_data_dir)?;
    let digest = Sha256::digest(raw.as_bytes());
    let mut bytes = [0u8; 8];
    bytes.copy_from_slice(&digest[..8]);
    Ok(u64::from_be_bytes(bytes))
}

/// Windows: the registry `MachineGuid` under
/// `HKLM\SOFTWARE\Microsoft\Cryptography`, via the `machine-uid` crate —
/// this app's real, hardware-bound machine identity.
#[cfg(target_os = "windows")]
fn raw_machine_id(_app_data_dir: &Path) -> Result<String, AppError> {
    machine_uid::get()
        .map_err(|e| AppError::Message(format!("could not read this machine's ID: {e}")))
}

/// Every other target this crate builds for (task #49: Android) — the
/// `machine-uid` crate has no backend there (it doesn't even compile:
/// `machine_id` has no Android module), and there's no hardware ID
/// reachable without extra JNI/Context plumbing this app doesn't have.
/// A ULID is generated once and persisted next to this app's own SQLite
/// file (task #6's `app_data_dir`), so it survives app restarts the same
/// way the real machine ID would — still a stable per-install identifier,
/// which is everything `machine_id_hash` actually promises callers.
#[cfg(not(target_os = "windows"))]
fn raw_machine_id(app_data_dir: &Path) -> Result<String, AppError> {
    let path = app_data_dir.join("install-id");
    if let Ok(existing) = std::fs::read_to_string(&path) {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    let id = ulid::Ulid::new().to_string();
    std::fs::create_dir_all(app_data_dir)
        .and_then(|()| std::fs::write(&path, &id))
        .map_err(|e| AppError::Message(format!("could not persist install ID: {e}")))?;
    Ok(id)
}

/// What today's date and a (possible) activation code, taken together,
/// mean for this installation. Every variant is something Settings' System
/// pane (task #38) can render directly — this is the one enum that screen
/// switches on.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(
    tag = "Kind",
    rename_all = "PascalCase",
    rename_all_fields = "PascalCase"
)]
pub enum LicenseState {
    /// No activation code saved yet, and the trial clock hasn't run out.
    Trial { days_left: i64 },
    /// No activation code saved, and it has.
    TrialExpired,
    /// A code verified, matches this machine, and (if it carries an
    /// expiry at all) hasn't passed it yet.
    Licensed { expires_on: Option<NaiveDate> },
    /// A code verified and matched this machine once, but its own expiry
    /// date has passed.
    Expired { expired_on: NaiveDate },
    /// A code is saved but can't be trusted as-is: bad signature (mistyped
    /// or not genuine), or it was signed for a different machine's hash
    /// entirely (moving a saved code between two PCs, most likely).
    Invalid { reason: String },
}

/// Pure — no clock read, no I/O, so every branch is exercised the same way
/// `tools/licensegen verify` already exercised the format crate underneath
/// it (task #37's own verification step). The three inputs are exactly the
/// three things a caller needs to gather from the outside world first:
/// today's date, this machine's hash, and whatever code (if any) is saved.
pub fn evaluate(
    today: NaiveDate,
    trial_started_on: NaiveDate,
    this_machine_hash: u64,
    activation_code: Option<&str>,
) -> LicenseState {
    let Some(code) = activation_code else {
        let days_left = TRIAL_DAYS - (today - trial_started_on).num_days();
        return if days_left >= 0 {
            LicenseState::Trial { days_left }
        } else {
            LicenseState::TrialExpired
        };
    };

    let payload = match license_format::verify_activation_code(code) {
        Ok(payload) => payload,
        Err(e) => {
            return LicenseState::Invalid {
                reason: e.to_string(),
            }
        }
    };

    if payload.machine_hash != this_machine_hash {
        return LicenseState::Invalid {
            reason: "this code was issued for a different machine".to_string(),
        };
    }

    match payload.expires_on {
        Some(expiry) if expiry < today => LicenseState::Expired { expired_on: expiry },
        expires_on => LicenseState::Licensed { expires_on },
    }
}
