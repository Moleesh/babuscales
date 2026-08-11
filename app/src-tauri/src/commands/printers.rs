use serde::Serialize;

use crate::devices::printers;
use crate::error::AppError;

/// The one field the frontend needs — a name to offer alongside
/// PRINTER_FIXTURES in the Printers pane. PascalCase to match every other
/// command's DTO convention (store/dto.rs, docs/CodingStandards.md —
/// "PascalCase JSON keys, matching VaultBill").
#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct DetectedPrinterDto {
    pub name: String,
}

#[tauri::command]
pub fn list_printers() -> Result<Vec<DetectedPrinterDto>, AppError> {
    Ok(printers::list_printers()?
        .into_iter()
        .map(|p| DetectedPrinterDto { name: p.name })
        .collect())
}
