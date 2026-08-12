//! The Rust core. Confined to hardware, storage and transport — target
//! under 15% of the codebase (PLAN §5). All domain logic is TypeScript in
//! `../src/engines/`, so it runs identically on desktop, LAN, the browser
//! demo and, later, Android.

pub mod commands;
pub mod devices;
pub mod error;
pub mod licensing;
pub mod net;
pub mod outbox;
pub mod print;
pub mod security;
pub mod state;
pub mod store;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

use state::AppState;

// Returns the Result rather than unwrapping — `unwrap`/`expect` are banned
// outside main.rs (docs/CodingStandards.md), so the top-level panic point
// stays in main.rs, the one sanctioned place for it.
//
// `app.security.csp` in tauri.conf.json (not this file — Tauri's schema
// rejects unknown/comment fields there, confirmed by `cargo build` failing
// on an earlier attempt to inline the note as JSON) is a defense-in-depth
// layer for every command registered below: with no CSP, any script that
// ever ran in the webview could reach all of them. The value there —
// `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
// img-src 'self' data:; font-src 'self' data:; connect-src 'self';
// object-src 'none'; base-uri 'self'; form-action 'self'` — only allows the
// bundled build (`frontendDist`) plus `data:` URIs for images (captured
// photos and the QR code built as a data URI in
// `src/engines/print/qr.ts`), since the app never loads an external script,
// stylesheet, font or image host. `style-src` keeps `unsafe-inline` because
// Vite's build output and component libraries commonly rely on inline
// `style` attributes; `script-src` does not get the same allowance. This
// was not verified against a running dev/prod build in this change — it is
// a conservative reading of what the app actually loads, and the app
// should be smoke-tested after this change lands.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> tauri::Result<()> {
    tauri::Builder::default()
        // Launch-at-login (PLAN §21 window-behaviour item) — the app then
        // stays running (see the close-to-tray handler below), so it's live
        // again after every later sleep/wake without needing a separate "on
        // wake" hook; `MacosLauncher` is unused on Windows but the API is
        // cross-platform.
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .on_window_event(|window, event| {
            // The window's own X button: hide to the tray instead of
            // exiting, so a stray click never kills the daily-summary
            // scheduler's headless send or the LAN verification server mid
            // ticket. Real exit is the tray menu's "Quit" item below,
            // which calls `app.exit()` directly rather than closing the
            // window, so it never reaches this handler at all.
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
                // Minimize-to-tray: Tauri has no dedicated "minimized" event
                // (Windows/webview2 report it as an ordinary `Resized`), so
                // the only reliable signal is asking the OS after the fact —
                // `is_minimized()` reflects the real window state at the
                // point the resize fired. Restoring (un-minimizing) also
                // fires `Resized`, but by then `is_minimized()` is false, so
                // this only ever fires on the way down, never re-hides an
                // already-visible window.
                if let WindowEvent::Resized(_) = event {
                    if window.is_minimized().unwrap_or(false) {
                        let _ = window.hide();
                    }
                }
            }
        })
        .setup(|app| {
            // Idempotent — safe to call on every launch, not just the first.
            use tauri_plugin_autostart::ManagerExt;
            let _ = app.autolaunch().enable();

            let show = MenuItem::with_id(app, "show", "Show BabuScales", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show, &quit])?;
            TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .ok_or("no default window icon")?,
                )
                .menu(&tray_menu)
                // Left click restores the window directly (task: "opening
                // from tray") rather than popping the menu — right-click
                // still reaches Show/Quit via the OS's own tray-menu
                // handling, unaffected by this flag.
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            // `hide()` doesn't clear a prior minimize (the
                            // window-event handler above hides while still
                            // minimized) — without this, `show()` alone can
                            // bring back a window the OS still considers
                            // minimized, invisible again on some platforms.
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // One file, in the app's own data directory — not a project
            // path, not a temp dir (PLAN §6.4). `store::open` creates it
            // (and its parent) if this is the first run.
            let db_path = app.path().app_data_dir()?.join("babuscales.db");
            let conn = store::open(&db_path)?;
            app.manage(AppState {
                conn: std::sync::Mutex::new(conn),
                db_path,
                indicator: devices::indicator::new_state(),
                verification_server: net::new_state(),
                tunnel: net::tunnel::new_state(),
            });
            // Headless daily-summary launch (`--daily-summary`, from the
            // Task Scheduler entry `commands::scheduler::sync_daily_summary_task`
            // registers): hide the window immediately rather than flashing
            // the full UI on screen for what's meant to be an unattended
            // background send. `App.tsx` still boots normally underneath —
            // it's the one that notices the same flag, runs the send, and
            // calls `exit_app` when done.
            if commands::scheduler::is_headless_daily_summary() {
                if let Some(window) = app.get_webview_window("main") {
                    window.hide()?;
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::docs::get_doc,
            commands::docs::list_docs,
            commands::docs::save_doc,
            commands::docs::allocate_doc_seq,
            commands::docs::reset_doc_series,
            commands::indicator::list_serial_ports,
            commands::indicator::open_indicator_port,
            commands::indicator::close_indicator_port,
            commands::masters::get_master,
            commands::masters::list_masters,
            commands::masters::save_master,
            commands::configs::get_config,
            commands::configs::list_config,
            commands::configs::save_config,
            commands::indexes::create_custom_index,
            commands::indexes::drop_custom_index,
            commands::assets::get_asset_meta,
            commands::assets::get_asset_bytes,
            commands::assets::list_asset_meta,
            commands::assets::put_asset,
            commands::audit::append_audit,
            commands::audit::list_audit,
            commands::net::start_verification_server,
            commands::net::stop_verification_server,
            commands::net::verification_server_status,
            commands::outbox::enqueue_outbox,
            commands::outbox::list_outbox,
            commands::outbox::update_outbox,
            commands::backup::export_backup,
            commands::backup::import_backup,
            commands::tunnel::save_tunnel_token,
            commands::tunnel::clear_tunnel_token,
            commands::tunnel::has_tunnel_token,
            commands::tunnel::start_tunnel,
            commands::tunnel::stop_tunnel,
            commands::tunnel::tunnel_status,
            commands::licensing::license_request_code,
            commands::licensing::evaluate_license,
            commands::email::save_smtp_password,
            commands::email::clear_smtp_password,
            commands::email::has_smtp_password,
            commands::email::send_ticket_email,
            commands::sms::send_ticket_sms,
            commands::printers::list_printers,
            commands::webhook::send_webhook,
            commands::tally::write_tally_export,
            commands::board::send_board_message,
            commands::scheduler::sync_daily_summary_task,
            commands::scheduler::is_headless_daily_summary,
            commands::scheduler::exit_app,
        ])
        .run(tauri::generate_context!())
}
