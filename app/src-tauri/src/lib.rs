//! The Rust core. Confined to hardware, storage and transport — target
//! under 15% of the codebase (PLAN §5). All domain logic is TypeScript in
//! `../src/engines/`, so it runs identically on desktop, LAN, the browser
//! demo and, later, Android.

pub mod commands;
pub mod devices;
pub mod error;
pub mod net;
pub mod outbox;
pub mod print;
pub mod security;
pub mod store;

// Returns the Result rather than unwrapping — `unwrap`/`expect` are banned
// outside main.rs (docs/CodingStandards.md), so the top-level panic point
// stays in main.rs, the one sanctioned place for it.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Result<()> {
    tauri::Builder::default().run(tauri::generate_context!())
}
