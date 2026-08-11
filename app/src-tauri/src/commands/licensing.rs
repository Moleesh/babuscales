use chrono::NaiveDate;
use tauri::{AppHandle, Manager};

use crate::error::AppError;
use crate::licensing::{self, LicenseState};

/// The ~15-character code an operator reads or pastes to Babulens to get
/// an activation code back — see `licensing`'s own module doc. No DB
/// access: it's derived purely from this machine's own identity (`app` is
/// only used for its `app_data_dir()`, on the non-Windows fallback path —
/// see `licensing::machine_id_hash`'s own doc comment).
#[tauri::command]
pub fn license_request_code(app: AppHandle) -> Result<String, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Message(format!("could not resolve app data dir: {e}")))?;
    let hash = licensing::machine_id_hash(&dir)?;
    Ok(license_format::encode_request_code(hash))
}

/// Where this installation stands, given what the frontend already has on
/// hand. Deliberately takes `trial_started_on`/`activation_code` as
/// parameters rather than reading them off `AppState` itself — the config
/// row they live in (`ConfigKind: "License"`, task #38) is just another
/// row through the same generic `get_config`/`save_config` commands every
/// other Settings-shaped thing in this app already uses; this command's
/// only job is the two things TypeScript genuinely cannot do itself:
/// reading the machine ID and verifying an Ed25519 signature.
#[tauri::command]
pub fn evaluate_license(
    app: AppHandle,
    trial_started_on: String,
    activation_code: Option<String>,
) -> Result<LicenseState, AppError> {
    let trial_started_on =
        NaiveDate::parse_from_str(&trial_started_on, "%Y-%m-%d").map_err(|e| {
            AppError::Message(format!("bad TrialStartedOn date ({trial_started_on}): {e}"))
        })?;
    let today = chrono::Utc::now().date_naive();
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Message(format!("could not resolve app data dir: {e}")))?;
    let machine_hash = licensing::machine_id_hash(&dir)?;
    Ok(licensing::evaluate(
        today,
        trial_started_on,
        machine_hash,
        activation_code.as_deref(),
    ))
}
