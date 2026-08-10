import { invoke } from "@tauri-apps/api/core";

import type { TunnelSource, TunnelStatus } from "./types";

// Only ever imported from createTunnelSource.ts's guarded branch — see that
// file's own comment for why (same tree-shaking guarantee as
// @engines/verification/tauriVerificationServer.ts).
export const createTauriTunnel = (): TunnelSource => ({
    hasToken: () => invoke<boolean>("has_tunnel_token"),
    saveToken: (token) => invoke<void>("save_tunnel_token", { token }),
    clearToken: () => invoke<void>("clear_tunnel_token"),
    start: () => invoke<TunnelStatus>("start_tunnel"),
    stop: () => invoke<void>("stop_tunnel"),
    status: () => invoke<TunnelStatus>("tunnel_status"),
});
