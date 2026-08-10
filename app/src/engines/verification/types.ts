// PLAN §18 — QR verification: "every ticket carries a QR resolving to a
// page showing the authentic weighment... making forged slips worthless."
// §23 item 6 settled hosting as LAN-only, sharable by URL. The server
// itself lives in Rust (src-tauri/src/net/mod.rs) — desktop-only, same
// reason the real weight indicator is (`@engines/indicator`'s own doc
// comment): there is no process to host it in a browser tab.

export interface VerificationServerStatus {
    Port: number;
    /** `null` when this machine has no resolvable outward-facing network route (offline) — the server is still reachable at LoopbackUrl. */
    LanUrl: string | null;
    LoopbackUrl: string;
}

export interface VerificationServerSource {
    /** Starts the server if it isn't already running. `null` in a build with nowhere to run it (the no-op source). */
    start: () => Promise<VerificationServerStatus | null>;
    stop: () => Promise<void>;
    status: () => Promise<VerificationServerStatus | null>;
}
