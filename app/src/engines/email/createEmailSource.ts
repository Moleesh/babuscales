import { createNoopEmail } from "./noopEmail";
import { createTauriEmail } from "./tauriEmail";
import type { EmailSource } from "./types";

// Same build-time branch as db/createDataPort.ts and
// @engines/tunnel/createTunnelSource.ts, tested the same direct-in-place
// way for the same tree-shaking reason — see either of those files' own
// comment for the full story. Not re-exported from this module's barrel
// (index.ts); WeighingScreen.tsx imports it directly.
export const createEmailSource = (): EmailSource => {
    if (import.meta.env.VITE_DATA_ADAPTER === "tauri") return createTauriEmail();
    return createNoopEmail();
};
