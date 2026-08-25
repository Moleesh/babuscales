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

// Reopening the app — a second launch while one is already running, the
// tray icon's left-click, or the tray menu's "Show" — used to be treated as
// another "always full restart" case, same reasoning as the tray menu's own
// "Restart" item. That's wrong for all three: none of them is the operator
// asking to restart, they're asking to see the window that's already there,
// and a `restart()` there silently drops whatever ticket was mid-capture.
// Reveal instead: unminimize (a minimized window is otherwise invisible to
// `.show()`), then show, then focus — the same three calls Windows' own
// taskbar-icon-click does. Only the tray menu's explicit "Restart" item
// still calls `app.restart()` — that one really is the operator asking for
// a clean relaunch.
fn reveal_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if let Err(err) = window.unminimize() {
        eprintln!("reveal_main_window: unminimize() failed: {err}");
    }
    if let Err(err) = window.show() {
        eprintln!("reveal_main_window: show() failed: {err}");
    }
    if let Err(err) = window.set_focus() {
        eprintln!("reveal_main_window: set_focus() failed: {err}");
    }
}

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
        // Second-launch guard — reopening the app while an instance is
        // already running (a stray double-click on the desktop icon, most
        // often) must not spawn a second process fighting the first over
        // the sqlite file, serial ports and the LAN verification server's
        // port. This callback runs in the *already-running* instance the
        // moment a second launch is detected; `reveal_main_window` brings
        // that existing instance to the front instead of restarting it —
        // an operator mid-capture on a ticket gets their window back, not
        // a wiped deck. The second launch's own process exits on its own
        // once this plugin's OS-level single-instance lock hands off to it.
        // Registered first so it can short-circuit before autostart/tray/
        // window setup below ever run a second time.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            reveal_main_window(app);
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
            // is still the right approach if a fill-to-monitor mode is ever
            // wanted again — it lives in `commands::window::fill_screen`,
            // a plain on-demand command. Nothing calls it right now: the
            // splash used to call it (and `setAlwaysOnTop`) the moment it
            // showed, which is exactly the "already full-screen before the
            // operator sees it open" behavior this comment is explaining
            // away from. Kept registered below rather than removed, since
            // `WindowPinSource.fillScreen` (src/engines/windowPin) is still
            // part of that engine's public shape.

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
                    // Left-click restores from tray — a plain reveal, same
                    // as the second-launch guard above. Only the menu's own
                    // "Restart" item below still does a full `app.restart()`
                    // — that one is the operator explicitly asking for a
                    // clean relaunch, not just wanting the window back.
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        reveal_main_window(tray.app_handle());
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
                    // This is deliberately the ONLY path left that ever
                    // calls `app.restart()` — an explicit operator ask, not
                    // an inferred one.
                    "restart" => app.restart(),
                    // Same reasoning as the tray icon's own left-click,
                    // above — "Show" is just another way to reopen from
                    // tray, so it gets the same plain reveal.
                    "show" => reveal_main_window(app),
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
            commands::window::restore_window,
            commands::docs::get_doc,
            commands::docs::list_docs,
            commands::docs::save_doc,
            commands::docs::allocate_doc_seq,
            commands::docs::save_doc_and_allocate_seq,
            commands::docs::reset_doc_series,
            commands::indicator::list_serial_ports,
            commands::indicator::open_indicator_port,
            commands::indicator::close_indicator_port,
            commands::masters::get_master,
            commands::masters::list_masters,
            commands::masters::save_master,
            commands::masters::delete_master,
            commands::configs::get_config,
            commands::configs::list_config,
            commands::configs::save_config,
            commands::configs::delete_config,
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
