use crate::error::AppError;
use crate::net::email;

#[tauri::command]
pub fn save_smtp_password(password: String) -> Result<(), AppError> {
    email::save_password(&password)
}

#[tauri::command]
pub fn clear_smtp_password() -> Result<(), AppError> {
    email::clear_password()
}

#[tauri::command]
pub fn has_smtp_password() -> Result<bool, AppError> {
    email::has_password()
}

#[tauri::command]
pub fn send_ticket_email(
    host: String,
    port: u16,
    username: String,
    to: String,
    subject: String,
    body: String,
) -> Result<(), AppError> {
    email::send(&host, port, &username, &to, &subject, &body)
}
