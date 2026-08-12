// The always-on-top pin toggle (top bar, task #62) — one method, same
// "thin wrapper over the real adapter call" shape as every other
// `@engines/*` source in this app.
export interface WindowPinSource {
    /** Tauri's own `Window.setAlwaysOnTop` — a no-op outside the desktop
        build (browser preview / Pages), same as every other engine's noop
        adapter. */
    setAlwaysOnTop: (pinned: boolean) => Promise<void>;
}
