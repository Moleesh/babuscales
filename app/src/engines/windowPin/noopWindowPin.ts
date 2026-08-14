import type { WindowPinSource } from "./types";

// The memory-adapter/GitHub-Pages build: no Tauri window to pin at all —
// same "honestly report nothing here" shape as @engines/scheduler's own
// noop source.
export const createNoopWindowPin = (): WindowPinSource => ({
    setAlwaysOnTop: () => Promise.resolve(),
    minimize: () => Promise.resolve(),
    close: () => Promise.resolve(),
});
