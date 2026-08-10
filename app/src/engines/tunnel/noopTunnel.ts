import type { TunnelSource } from "./types";

// The memory-adapter/GitHub-Pages build: there is no desktop process to
// spawn `cloudflared` from in a browser tab, so this honestly reports "no
// token, not running" rather than pretending — same shape as
// @engines/verification/noopVerificationServer.ts.
export const createNoopTunnel = (): TunnelSource => ({
    hasToken: () => Promise.resolve(false),
    saveToken: () => Promise.resolve(),
    clearToken: () => Promise.resolve(),
    start: () => Promise.resolve(null),
    stop: () => Promise.resolve(),
    status: () => Promise.resolve(null),
});
