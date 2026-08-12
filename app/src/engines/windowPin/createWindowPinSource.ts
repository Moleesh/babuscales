import { createNoopWindowPin } from "./noopWindowPin";
import { createTauriWindowPin } from "./tauriWindowPin";
import type { WindowPinSource } from "./types";

// Same build-time branch as db/createDataPort.ts and every other
// @engines/*/createXSource.ts — tested the same direct-in-place way for the
// same tree-shaking reason (see db/createDataPort.ts's own comment for the
// full story).
export const createWindowPinSource = (): WindowPinSource => {
    if (import.meta.env.VITE_DATA_ADAPTER === "tauri") return createTauriWindowPin();
    return createNoopWindowPin();
};
