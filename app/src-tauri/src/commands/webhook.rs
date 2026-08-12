use crate::error::AppError;
use crate::net::webhook;

#[tauri::command]
pub fn send_webhook(
    endpoint: String,
    secret: String,
    payload_json: String,
) -> Result<(), AppError> {
    webhook::send(&endpoint, &secret, &payload_json)
}
