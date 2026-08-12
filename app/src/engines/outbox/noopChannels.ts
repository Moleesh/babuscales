import type { OutboxChannelSources } from "./types";

// The memory-adapter/GitHub-Pages build: there's no HTTP client, filesystem
// or TCP socket to reach from a browser tab, so this honestly reports "not
// available in this build" rather than pretending — same shape as
// @engines/email/@engines/sms's own noop sources.
const unavailable = (label: string) =>
    Promise.resolve({
        Ok: false as const,
        Error: `${label} delivery — desktop app only, not available in this build`,
    });

export const createNoopOutboxChannels = (): OutboxChannelSources => ({
    webhook: { send: () => unavailable("Webhook") },
    tally: { send: () => unavailable("Accounting export") },
    board: { send: () => unavailable("Display board") },
});
