//! Tauri commands — the only surface the frontend calls through `invoke()`.
//! Each command validates its input (via serde deserialisation into the
//! `store::dto` shapes) and delegates straight to `store`; no business
//! logic lives here — PLAN §5, Rust stays confined to hardware, storage
//! and transport. One file per resource, mirroring both `store/`'s own
//! split and the TS memory adapter's (`src/db/adapters/memory/`).

pub mod assets;
pub mod audit;
pub mod backup;
pub mod configs;
pub mod docs;
pub mod indicator;
pub mod masters;
pub mod net;
pub mod outbox;
