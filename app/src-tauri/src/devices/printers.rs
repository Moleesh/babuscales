// Task #52 — real installed-printer enumeration. Same shape as
// devices/indicator.rs's `list_ports()`: a stateless OS-enumeration call,
// no connection to manage, nothing to hold in AppState.
//
// Phase 1 only (Windows path below): the printer *names* Windows already
// knows about (Settings → Printers & scanners), via `EnumPrintersW`. This
// is deliberately NOT paper-size/DPI capability lookup
// (`DeviceCapabilitiesW`) — PRINTER_FIXTURES (settingsSchema.ts) already
// covers "what capabilities does an A4/thermal/matrix printer have" as a
// curated, editable list; what was actually missing was "which printers
// does this machine have plugged in right now", so that's the one real gap
// this closes. Every `unsafe` block below is commented with its invariant
// (docs/CodingStandards.md).
//
// Task #49 (Android): `EnumPrintersW` is Win32-only by construction — an
// Android build has no equivalent OS-level printer spooler to ask (Android
// printing goes through the OS's own Print Framework/PrintManager, a
// different, much larger API this app doesn't integrate — same "not what
// this closes" scoping as the DeviceCapabilitiesW cut above). The
// non-Windows path below returns an honest empty list, the same "noop is
// honest" convention as every other hardware source in this codebase that
// has nothing to enumerate on a given target (compare `engines/printers/
// noopPrinters.ts` on the TS side, for the browser/Pages build).

#[cfg(target_os = "windows")]
use windows::core::PCWSTR;
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Printing::{
    EnumPrintersW, PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL, PRINTER_INFO_4W,
};

use crate::error::AppError;

pub struct DetectedPrinter {
    pub name: String,
}

/// Lists the printers Windows currently has installed — local printers and
/// ones connected via a print server, same set the OS's own print dialog
/// offers. Level 4 (`PRINTER_INFO_4W`) is the cheapest info level that still
/// carries the printer name, which is all this needs.
#[cfg(target_os = "windows")]
pub fn list_printers() -> Result<Vec<DetectedPrinter>, AppError> {
    const LEVEL: u32 = 4;
    let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;

    let mut needed: u32 = 0;
    let mut returned: u32 = 0;

    // SAFETY: first call is the documented "ask how many bytes I need"
    // sizing probe — `pPrinters: None` is explicitly allowed by the Win32
    // contract for this purpose. It always reports failure (buffer too
    // small) even on success paths; only `needed` is meaningful here, so
    // the Result is intentionally discarded.
    let _ = unsafe {
        EnumPrintersW(
            flags,
            PCWSTR::null(),
            LEVEL,
            None,
            &mut needed,
            &mut returned,
        )
    };

    if needed == 0 {
        return Ok(Vec::new());
    }

    let mut buffer = vec![0u8; needed as usize];

    // SAFETY: `buffer` is sized to exactly the `needed` the sizing call
    // reported, which Win32 guarantees is enough for this same query
    // (flags/level/name unchanged) run immediately after with no
    // intervening printer-list change on this machine.
    unsafe {
        EnumPrintersW(
            flags,
            PCWSTR::null(),
            LEVEL,
            Some(&mut buffer),
            &mut needed,
            &mut returned,
        )
    }
    .map_err(|e| AppError::Message(format!("could not list printers: {e}")))?;

    // SAFETY: on success, Win32 has written `returned` contiguous
    // `PRINTER_INFO_4W` structs starting at `buffer`'s base — that's what
    // level 4 means. `buffer` outlives `infos` (dropped at function end,
    // after the loop below has copied every name out of it).
    let infos = unsafe {
        std::slice::from_raw_parts(buffer.as_ptr().cast::<PRINTER_INFO_4W>(), returned as usize)
    };

    let mut result = Vec::with_capacity(infos.len());
    for info in infos {
        if info.pPrinterName.is_null() {
            continue;
        }
        // SAFETY: `pPrinterName` is a non-null pointer into `buffer`'s own
        // backing allocation (Win32 packs PRINTER_INFO_4W's string fields
        // after the fixed struct array, all within the same buffer this
        // call sized) — valid and null-terminated for as long as `buffer`
        // is alive, which it still is here. `to_string()` copies it out.
        let name = unsafe { info.pPrinterName.to_string() }.unwrap_or_default();
        if !name.is_empty() {
            result.push(DetectedPrinter { name });
        }
    }
    Ok(result)
}

/// Android has no OS-level printer spooler this app can enumerate (see this
/// module's own doc comment) — an honest empty list, same shape as every
/// other noop hardware source in this codebase.
#[cfg(not(target_os = "windows"))]
pub fn list_printers() -> Result<Vec<DetectedPrinter>, AppError> {
    Ok(Vec::new())
}
