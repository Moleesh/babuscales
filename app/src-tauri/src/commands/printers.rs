use serde::Serialize;

use crate::devices::printers;
use crate::error::AppError;

/// What the frontend's single printer dropdown needs — a name plus whether
/// Windows currently names this one its own default (so the picker can
/// preselect it the same way the OS's own print dialog would). PascalCase
/// to match every other command's DTO convention (store/dto.rs,
/// docs/CodingStandards.md — "PascalCase JSON keys, matching VaultBill").
#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct DetectedPrinterDto {
    pub name: String,
    pub is_default: bool,
}

#[tauri::command]
pub fn list_printers() -> Result<Vec<DetectedPrinterDto>, AppError> {
    Ok(printers::list_printers()?
        .into_iter()
        .map(|p| DetectedPrinterDto {
            name: p.name,
            is_default: p.is_default,
        })
        .collect())
}
