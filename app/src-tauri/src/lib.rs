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
        // Second-launch guard — same "always full restart" reasoning as the
        // tray icon's left-click/"Show" handlers above: reopening the app
        // while an instance is already running (tray-resident or on
        // screen) must not spawn a second process fighting the first over
        // the sqlite file, serial ports and the LAN verification server's
        // port. This callback runs in the *already-running* instance the
        // moment a second launch is detected, so `app.restart()` here is
        // what actually replaces the (possibly wedged) old process — the
        // second launch's own process exits on its own once this plugin's
        // OS-level single-instance lock hands off to it. Registered first
        // so it can short-circuit before autostart/tray/window setup below
        // ever run a second time.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            app.restart();
        }))
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
                    if let Err(err) = window.hide() {
                        eprintln!("close-to-tray: window.hide() failed: {err}");
                    }
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
            if let Err(err) = app.autolaunch().enable() {
                eprintln!("autolaunch: enable() failed: {err}");
            }

            // The window opens at `tauri.conf.json`'s configured 1280×800
            // size, unpinned — no fill-to-monitor here any more. That used
            // to run right here in `.setup()`, before the webview had drawn
            // a single frame, which made the window already full-screen and
            // pinned before the operator ever saw it open. Filling the
            // screen without asking Windows for either of its own "fill the
            // screen" window states (both were tried and had real costs —
            // `fullscreen: true` broke `.minimize()`/`.hide()` on Windows;
            // `maximized: true` on a borderless window drew a stray sliver
            // of desktop past the bottom edge, the "white bottom bar" bug)
            // is still the right approach — it now lives in
            // `commands::window::fill_screen`, a command the frontend calls
            // once the UI (pin icon included) is actually on screen, so
            // there's a visible small-window moment first and the fill+pin
            // transition happens where the operator can see it happen.

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
                    // Left-click restores from tray the same way the menu's
                    // own "Restart" does — a full `app.restart()`, not
                    // unminimize/show/focus on the existing (possibly
                    // crashed-frontend, possibly dev-server-down) window.
                    // Reopening from tray is deliberately never a "just
                    // reveal what's already there" action any more: a
                    // window hidden to the tray (the X button, below) can
                    // sit for hours with a frontend that's silently wedged
                    // (a dev-server crash, a stuck async call), and simply
                    // showing it again would surface that same broken state
                    // instead of recovering it. The daily-summary
                    // scheduler/LAN verification server restart along with
                    // everything else — `app.manage(AppState { .. })`
                    // below runs again on the fresh process, so nothing is
                    // left orphaned.
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        tray.app_handle().restart();
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
                    // Same reasoning as the tray icon's own left-click,
                    // above — "Show" is another way to reopen from tray, so
                    // it gets the same full restart instead of revealing a
                    // possibly-wedged existing window.
                    "show" => app.restart(),
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
            commands::window::fill_screen,
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
