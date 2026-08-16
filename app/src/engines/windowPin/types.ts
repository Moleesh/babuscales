// The always-on-top pin toggle (top bar) — one method, same
// "thin wrapper over the real adapter call" shape as every other
// `@engines/*` source in this app.
export interface WindowPinSource {
    /** Tauri's own `Window.setAlwaysOnTop` — a no-op outside the desktop
        build (browser preview / Pages), same as every other engine's noop
        adapter. */
    setAlwaysOnTop: (pinned: boolean) => Promise<void>;
    /** Send the window to the taskbar without touching its visibility. Tauri's
        own `Window.minimize` — a no-op outside the desktop build. */
    minimize: () => Promise<void>;
    /** Hides the window to the tray, not Tauri's `Window.close`. A
        programmatic `.close()` call destroys the window directly without
        ever raising `WindowEvent::CloseRequested` on the Rust side (that
        event is only synthesized for an OS-initiated close — the native X
        button, Alt+F4 — not a JS-driven one), so lib.rs's close-to-tray
        handler never runs for this button. `.hide()` reproduces that
        handler's own behaviour directly from the frontend instead of
        relying on an event that never fires here. A no-op outside the
        desktop build. */
    close: () => Promise<void>;
}
