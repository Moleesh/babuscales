//! Real delivery for Settings' Integrations → "Accounting export" channel —
//! deliberately the simplest possible thing that can be called an export:
//! one CSV line appended to a local file. No Tally XML/proprietary
//! accounting format is attempted here — that's explicitly out of scope for
//! the outbox-worker task this module belongs to; a real Tally integration
//! (XML import format, ODBC, whatever "Tally" turns out to mean for a given
//! site) is future work, not this.
//!
//! Same "no persistent connection" shape as `net::email`/`net::sms`/
//! `net::webhook`: opens the file, appends, closes, once per outbox row.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

use crate::error::AppError;

const FILE_NAME: &str = "tally_export.csv";
const HEADER: &str = "TicketNo,Date,VehicleNo,Party,Material,NetKg,Charge\n";

/// Appends one already-formatted CSV line (no trailing newline expected —
/// this adds it) to `{folder}/tally_export.csv`, creating the folder and,
/// on first write, the file with its header row, if they don't exist yet.
/// `folder` is fully admin-controlled config (Settings → Connections), not
/// user/network input, so there's no path-traversal concern to guard
/// against here — but an empty string is rejected outright, the same
/// "not configured yet" contract every other channel in this module uses.
pub(crate) fn append_export(folder: &str, line_csv: &str) -> Result<(), AppError> {
    let folder = folder.trim();
    if folder.is_empty() {
        return Err(AppError::Message(
            "no accounting export folder configured — set one in Settings → Connections first"
                .into(),
        ));
    }

    std::fs::create_dir_all(folder)
        .map_err(|e| AppError::Message(format!("could not create export folder {folder}: {e}")))?;

    let path = Path::new(folder).join(FILE_NAME);
    let is_new = !path.exists();

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| AppError::Message(format!("could not open {}: {e}", path.display())))?;

    if is_new {
        file.write_all(HEADER.as_bytes())
            .map_err(|e| AppError::Message(format!("could not write export header: {e}")))?;
    }

    file.write_all(line_csv.as_bytes())
        .and_then(|_| file.write_all(b"\n"))
        .map_err(|e| AppError::Message(format!("could not write export line: {e}")))?;

    Ok(())
}
