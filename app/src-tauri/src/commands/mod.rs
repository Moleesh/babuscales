//! Tauri commands — the only surface the frontend calls through `invoke()`.
//! Each command validates its input, delegates to `store`/`devices`/`print`,
//! and returns `Result<T, AppError>`. No business logic lives here; see
//! PLAN §5 — Rust stays confined to hardware, storage and transport.
