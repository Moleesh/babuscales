// Entry point only. Everything else lives in lib.rs so the mobile targets
// (Android/iOS, PLAN §21 Phase 8) can link the same crate without a main().
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    babuscale_lib::run().expect("error while running BabuScale");
}
