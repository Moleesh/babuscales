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
                // No Resized-based "hide on minimize" here on purpose — an
                // earlier version of this handler treated every minimize
                // the same as a close (hiding the window from the taskbar
                // entirely, via `is_minimized()` checked on each `Resized`
                // event, since Windows/webview2 report minimize as an
                // ordinary resize with no dedicated event). That conflated
                // the app's two window-affordances into one: Minimize
                // (App.tsx's `─` button, `windowPin.minimize`) is meant to
                // send the window to the taskbar like any normal window: a
                // plain `.minimize()` call, no handler needed here at all.
                // Close (the `✕` button and the OS's own X, both funnelled
                // through `CloseRequested` above) is the only thing that
                // hides to the tray.
            }
        })
        .setup(|app| {
            // Idempotent — safe to call on every launch, not just the first.
            use tauri_plugin_autostart::ManagerExt;
            let _ = app.autolaunch().enable();

            // Fills the screen without asking Windows for either of its own
            // "fill the screen" window states — both were tried and each had
            // a real cost. `fullscreen: true` (tauri.conf.json) put the
            // window into genuine OS exclusive/borderless-fullscreen mode,
            // which on Windows silently blocks programmatic `.minimize()`
            // (and made `.hide()` unreliable) regardless of `minimizable`/
            // capability settings. `maximized: true` avoided that, but a
            // borderless (`decorations: false`) + maximized window has a
            // well-known Windows/DWM quirk where the invisible resize border
            // pokes a sliver of the desktop out past the bottom edge — the
            // "white bottom bar" bug. Matching the primary monitor's size
            // and pinning position to (0,0) directly gets the same visual
            // result as either flag while keeping the window in Windows'
            // ordinary, unmaximized/unfullscreened state, where minimize
            // and hide behave normally and there's no maximize-border
            // artifact to draw.
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.primary_monitor() {
                    let _ = window.set_size(*monitor.size());
                    let _ = window.set_position(*monitor.position());
                }
            }

            // The only tray icon this app creates — tauri.conf.json used to
            // also declare `app.trayIcon`, which auto-builds a second,
            // menu-less default tray icon at startup alongside this one
            // (Tauri's own config-driven convenience feature, unaware this
            // app already builds its own with a real menu below). That
            // config block is removed; this is the single source of truth.
            let show = MenuItem::with_id(app, "show", "Show BabuScales", true, None::<&str>)?;
            let restart = MenuItem::with_id(app, "restart", "Restart", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show, &restart, &quit])?;
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
                    // Relaunch in place — the tray-icon-cleanup-on-drop that
                    // `app.exit`/quitting does normally can't run mid-`restart`
                    // call (it terminates the process directly), so the old
                    // tray icon can linger as a stale/ghost entry until
                    // Explorer refreshes; same artifact as a manual
                    // taskkill-based restart, not a new bug this introduces.
                    "restart" => app.restart(),
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
            let headless = commands::scheduler::is_headless_daily_summary();
            if headless {
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
