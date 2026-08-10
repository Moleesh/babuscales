//! Secrets — never a config file, never the repository (PLAN §18: "that was
//! the real defect in v2, not ngrok itself"). The one tenant so far is the
//! Cloudflare Tunnel connector token (`net::tunnel`); the audit hash chain
//! itself is verified in `store::audit`/`store::hash`, not here, despite
//! what an earlier draft of this file's own comment claimed.
//!
//! Backed by the OS credential store via the `keyring` crate — the Windows
//! Credential Manager on Windows (this app's one shipping target so far;
//! `windows-native` is the only backend feature enabled — see Cargo.toml),
//! Keychain on macOS, the Secret Service on Linux if those targets are ever
//! built. One "service" name for the whole app; each secret gets its own
//! "account" name within it, the same two-level shape Windows Credential
//! Manager itself uses.

use keyring::Entry;

use crate::error::AppError;

const SERVICE: &str = "BabuScales";

fn entry(account: &str) -> Result<Entry, AppError> {
    Entry::new(SERVICE, account)
        .map_err(|e| AppError::Message(format!("credential store unavailable: {e}")))
}

/// Overwrites any existing secret already saved under `account`.
pub(crate) fn set_secret(account: &str, value: &str) -> Result<(), AppError> {
    entry(account)?
        .set_password(value)
        .map_err(|e| AppError::Message(format!("could not save credential: {e}")))
}

/// `Ok(None)` when nothing has been saved under `account` yet — not an error,
/// since "no tunnel token configured" is an expected, ordinary state.
pub(crate) fn get_secret(account: &str) -> Result<Option<String>, AppError> {
    match entry(account)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Message(format!("could not read credential: {e}"))),
    }
}

/// A no-op if nothing is saved under `account`, so it's always safe to call.
pub(crate) fn delete_secret(account: &str) -> Result<(), AppError> {
    match entry(account)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::Message(format!(
            "could not delete credential: {e}"
        ))),
    }
}
