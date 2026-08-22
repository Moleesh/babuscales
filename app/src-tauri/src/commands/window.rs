//! `fill_screen` — called once from the frontend after the UI has actually
//! rendered (`disableNumberInputScroll`'s sibling in spirit: a startup-only
//! side effect, not a per-render one), rather than in `lib.rs`'s `.setup()`
//! before the webview has drawn anything. Deliberately not run at `.setup()`
//! time any more: the operator asked for the window to open at its
//! configured 1280×800 size, unpinned, and only grow to fill the screen
//! (and pin itself) once the UI — the pin icon included — is actually on
//! screen, so there's a visible small-window moment instead of the window
//! silently already being full-screen and pinned before anything renders.
//!
//! `tauri.conf.json`'s `decorations: true` means the window opens with a
//! real OS title bar (and its own close button) — deliberately, so a dev
//! server that isn't up yet (`ERR_CONNECTION_REFUSED` before the page, and
//! so `splashWindowControls.ts`, ever loads) still leaves the operator a
//! way to close the window instead of a borderless, buttonless dead end.
//! This command is the one place that ever turns decorations back off,
//! since it only runs once content has actually loaded and started this
//! same fill/pin transition.

// Undoes `fill_screen` — called when the operator unpins (turns off
// always-on-top). `fill_screen`'s borderless window covers the whole
// monitor including where the taskbar sits; once always-on-top is gone,
// that borderless full-monitor window fights the taskbar's own z-order
// (task: "when unpining the taskbar flashes and goes behind"). Restoring
// decorations and `tauri.conf.json`'s own configured 1280x800 size, then
// re-centering, puts the window back to a normal top-level window the OS
// window manager stacks correctly relative to the taskbar again.
#[tauri::command]
pub fn restore_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.set_decorations(true).map_err(|err| err.to_string())?;
    window
        .set_size(tauri::LogicalSize::new(1280.0, 800.0))
        .map_err(|err| err.to_string())?;
    window.center().map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn fill_screen(window: tauri::WebviewWindow) -> Result<(), String> {
    // Must happen before the border-measurement below — that logic assumes
    // a borderless window (matching how it behaved back when this all ran
    // in `.setup()` with `decorations: false` from the start); doing it
    // after `set_decorations` keeps that assumption true, rather than
    // measuring a stale titlebar-inclusive `inner_size`.
    window.set_decorations(false).map_err(|err| err.to_string())?;

    let monitor = window
        .primary_monitor()
        .map_err(|err| err.to_string())?
        .ok_or("no primary monitor")?;
    let target_pos = *monitor.position();
    let target_size = *monitor.size();
    window.set_size(target_size).map_err(|err| err.to_string())?;
    window
        .set_position(target_pos)
        .map_err(|err| err.to_string())?;

    // Windows/DWM reserves an invisible resize-border/shadow margin around
    // every top-level window — even a `resizable: false`, `decorations:
    // false` one — which eats inward from the visible client area rather
    // than padding outward, so `inner_size` (the actual visible/content
    // rect) comes back smaller than `outer_size` on every edge. Rather than
    // hardcoding a border width (wrong at every DPI scale but one), read
    // back what the OS actually placed the window at and grow/shift by the
    // measured discrepancy — self-correcting across monitors/scale factors
    // instead of a guessed constant. Same fix, same reasoning, as this had
    // when it lived in `lib.rs`'s `.setup()` before this file existed.
    if let (Ok(actual_outer), Ok(actual_inner)) = (window.outer_size(), window.inner_size()) {
        let border_x = actual_outer.width.saturating_sub(actual_inner.width);
        let border_y = actual_outer.height.saturating_sub(actual_inner.height);
        if border_x != 0 || border_y != 0 {
            let half_x = (border_x / 2) as i32;
            let half_y = (border_y / 2) as i32;
            window
                .set_position(tauri::PhysicalPosition::new(
                    target_pos.x - half_x,
                    target_pos.y - half_y,
                ))
                .map_err(|err| err.to_string())?;
            window
                .set_size(tauri::PhysicalSize::new(
                    target_size.width + border_x,
                    target_size.height + border_y,
                ))
                .map_err(|err| err.to_string())?;
        }
    }
    Ok(())
}
