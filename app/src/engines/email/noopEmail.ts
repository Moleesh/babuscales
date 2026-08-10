import type { EmailSource } from "./types";

// The memory-adapter/GitHub-Pages build: there is no SMTP client to send
// from in a browser tab, so this honestly reports "no password, nothing
// sent" rather than pretending — same shape as @engines/tunnel's noop
// source.
export const createNoopEmail = (): EmailSource => ({
    hasPassword: () => Promise.resolve(false),
    savePassword: () => Promise.resolve(),
    clearPassword: () => Promise.resolve(),
    send: () =>
        Promise.resolve({
            Ok: false,
            Error: "e-mail delivery — desktop app only, not available in this build",
        }),
});
