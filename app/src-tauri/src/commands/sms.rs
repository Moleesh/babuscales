use crate::error::AppError;
use crate::net::sms;

#[tauri::command]
pub fn send_ticket_sms(
    port: String,
    baud: u32,
    to: String,
    message: String,
) -> Result<(), AppError> {
    sms::send(&port, baud, &to, &message)
}
