//! Task #42 — real Email/SMTP ticket delivery. Unlike `net::tunnel`, there is
//! no persistent connection to hold on `AppState`: a send is one blocking
//! round trip against the configured relay, made fresh every time. The SMTP
//! password is the one secret here — same "OS credential store, never a
//! config file" shape as the tunnel connector token (`security::set_secret`)
//! — while the host/port/username live as ordinary Settings config
//! (`settingsSchema.ts`'s `Smtp`), since none of those three are sensitive
//! on their own.
//!
//! `lettre`'s `rustls-tls` feature (Cargo.toml) means this never needs a
//! system OpenSSL install, matching PLAN's "no prerequisites" installer
//! goal — same reasoning as `rusqlite`'s bundled SQLite.

use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};

use crate::error::AppError;
use crate::security;

const PASSWORD_ACCOUNT: &str = "smtp-password";

pub(crate) fn save_password(password: &str) -> Result<(), AppError> {
    let trimmed = password.trim();
    if trimmed.is_empty() {
        return Err(AppError::Message("SMTP password can't be empty".into()));
    }
    security::set_secret(PASSWORD_ACCOUNT, trimmed)
}

pub(crate) fn clear_password() -> Result<(), AppError> {
    security::delete_secret(PASSWORD_ACCOUNT)
}

pub(crate) fn has_password() -> Result<bool, AppError> {
    Ok(security::get_secret(PASSWORD_ACCOUNT)?.is_some())
}

/// Builds and sends one message over STARTTLS, synchronously — the frontend
/// calls this once per outbox row (`engines/email`'s "drain of one" —
/// there's no background worker yet, see app/README.md's known gap), so a
/// blocking transport is the right size for what this does today.
pub(crate) fn send(
    host: &str,
    port: u16,
    username: &str,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), AppError> {
    let host = host.trim();
    let username = username.trim();
    let to = to.trim();
    if host.is_empty() {
        return Err(AppError::Message(
            "no SMTP host configured — set one in Settings → Connections first".into(),
        ));
    }
    if username.is_empty() {
        return Err(AppError::Message(
            "no SMTP username configured — set one in Settings → Connections first".into(),
        ));
    }
    let password = security::get_secret(PASSWORD_ACCOUNT)?.ok_or_else(|| {
        AppError::Message("no SMTP password saved — set one in Settings first".into())
    })?;

    let from: Mailbox = username.parse().map_err(|e| {
        AppError::Message(format!("SMTP username isn't a valid e-mail address: {e}"))
    })?;
    let to_mailbox: Mailbox = to
        .parse()
        .map_err(|e| AppError::Message(format!("party e-mail address is invalid: {e}")))?;

    let message = Message::builder()
        .from(from)
        .to(to_mailbox)
        .subject(subject)
        .body(body.to_string())
        .map_err(|e| AppError::Message(format!("could not build e-mail: {e}")))?;

    let mailer = SmtpTransport::starttls_relay(host)
        .map_err(|e| AppError::Message(format!("could not reach SMTP host: {e}")))?
        .port(port)
        .credentials(Credentials::new(username.to_string(), password))
        .build();

    mailer
        .send(&message)
        .map_err(|e| AppError::Message(format!("SMTP send failed: {e}")))?;

    Ok(())
}
