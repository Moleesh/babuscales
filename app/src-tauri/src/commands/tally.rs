use crate::error::AppError;
use crate::net::tally;

#[tauri::command]
pub fn write_tally_export(folder: String, line_csv: String) -> Result<(), AppError> {
    tally::append_export(&folder, &line_csv)
}
