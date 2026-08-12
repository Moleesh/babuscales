use crate::error::AppError;
use crate::net::board;

#[tauri::command]
pub fn send_board_message(host: String, port: u16, text: String) -> Result<(), AppError> {
    board::send_line(&host, port, &text)
}
