use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use rusqlite::Connection;
use sha2::{Digest, Sha256};

use crate::error::AppError;

#[derive(Debug, Clone, serde::Serialize)]
pub struct BackupInfo {
    pub path: PathBuf,
    pub sha256: String,
    pub size_bytes: u64,
    pub created_at: String,
}

/// Writes a complete, consistent copy of the database to `dest_path` via
/// SQLite's own `VACUUM INTO` — atomic, and safe against a live connection
/// (PLAN §6.4: one file, no ATTACH, no non-atomic cross-file write). Then
/// verifies it: a checksum alone doesn't prove the file is a valid
/// database, so an integrity check runs against the copy before this
/// returns (PLAN §14 — "an unverified backup is not a backup").
pub fn backup(conn: &Connection, dest_path: &Path) -> Result<BackupInfo, AppError> {
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent)?;
    }
    if dest_path.exists() {
        fs::remove_file(dest_path)?;
    }

    let dest_str = dest_path.to_string_lossy();
    conn.execute("VACUUM INTO ?1", [dest_str.as_ref()])?;

    verify_integrity(dest_path)?;
    let sha256 = hash_file(dest_path)?;
    let size_bytes = fs::metadata(dest_path)?.len();

    Ok(BackupInfo {
        path: dest_path.to_path_buf(),
        sha256,
        size_bytes,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

/// Restores `source_backup_path` over the live database at `dest_db_path`.
/// The caller must hold no open connection to `dest_db_path` when this
/// runs — replacing a file out from under an open SQLite connection is
/// undefined. The source is integrity-checked before anything at the
/// destination is touched, so a corrupt backup fails loudly instead of
/// silently destroying a working database.
pub fn restore(dest_db_path: &Path, source_backup_path: &Path) -> Result<(), AppError> {
    verify_integrity(source_backup_path)?;

    // A stale WAL/SHM sidecar next to the old file must not survive to be
    // replayed against the restored one.
    for suffix in ["-wal", "-shm"] {
        let sidecar = sidecar_path(dest_db_path, suffix);
        if sidecar.exists() {
            fs::remove_file(sidecar)?;
        }
    }

    fs::copy(source_backup_path, dest_db_path)?;
    Ok(())
}

fn sidecar_path(db_path: &Path, suffix: &str) -> PathBuf {
    let mut name = db_path.as_os_str().to_owned();
    name.push(suffix);
    PathBuf::from(name)
}

fn verify_integrity(path: &Path) -> Result<(), AppError> {
    let conn = Connection::open(path)?;
    let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
    if result != "ok" {
        return Err(AppError::Message(format!(
            "backup failed integrity check: {result}"
        )));
    }
    Ok(())
}

fn hash_file(path: &Path) -> Result<String, AppError> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect())
}
