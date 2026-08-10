import type { SmsSource } from "./types";

// The memory-adapter/GitHub-Pages build: there is no serial port to open
// from a browser tab, so this honestly reports "no ports, nothing sent"
// rather than pretending — same shape as @engines/email's noop source.
export const createNoopSms = (): SmsSource => ({
    listPorts: () => Promise.resolve([]),
    send: () =>
        Promise.resolve({
            Ok: false,
            Error: "SMS delivery — desktop app only, not available in this build",
        }),
});
