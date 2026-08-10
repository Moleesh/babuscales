// PLAN §18 — "Remote access — Cloudflare Tunnel, opt-in, off by default...
// Credentials go to the Windows Credential Manager, never to a config file,
// never to the repository." The connector itself lives in Rust
// (src-tauri/src/net/tunnel.rs) — desktop-only, same reason
// @engines/verification's server is: there is no process to spawn
// `cloudflared` from in a browser tab.

export const TUNNEL_STATES = ["Stopped", "Running", "Failed"] as const;
export type TunnelState = (typeof TUNNEL_STATES)[number];

export interface TunnelStatus {
    State: TunnelState;
    /** cloudflared's own last logged line, passed through verbatim — `null` before it has said anything. */
    Message: string | null;
}

export interface TunnelSource {
    /** Whether a token has been saved, without exposing its value. */
    hasToken: () => Promise<boolean>;
    /** Overwrites any previously saved token. */
    saveToken: (token: string) => Promise<void>;
    /** Stops the connector (it can't run without its own credential) and deletes the saved token. */
    clearToken: () => Promise<void>;
    /** Starts the connector if it isn't already running. `null` in a build with nowhere to run it (the no-op source). */
    start: () => Promise<TunnelStatus | null>;
    stop: () => Promise<void>;
    status: () => Promise<TunnelStatus | null>;
}
