import type { VerificationServerSource } from "./types";

// The memory-adapter/GitHub-Pages build: there is no desktop process to
// host a LAN server in a browser tab, so this honestly reports "not
// running" rather than pretending — same shape as the demo's serial port
// story (ConnectionsPane's own comment).
export const createNoopVerificationServer = (): VerificationServerSource => ({
    start: () => Promise.resolve(null),
    stop: () => Promise.resolve(),
    status: () => Promise.resolve(null),
});
