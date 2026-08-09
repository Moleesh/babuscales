use thiserror::Error;

/// The one error type Rust code returns. `unwrap()`/`expect()` are banned
/// outside `main.rs` (docs/CodingStandards.md) — everything else propagates
/// through this with `?`.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Sql(#[from] rusqlite::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Message(String),
}

// Tauri commands return their error to the frontend as JSON, which requires
// Serialize. A plain string is enough — the structured detail already went
// into the Display impl above and, for anything worth an audit trail, into
// the `audit` table itself.
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
