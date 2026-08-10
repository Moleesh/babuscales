import { createNoopVerificationServer } from "./noopVerificationServer";
import { createTauriVerificationServer } from "./tauriVerificationServer";
import type { VerificationServerSource } from "./types";

// Same build-time branch as db/createDataPort.ts and
// @engines/indicator/createIndicatorSource.ts, tested the same
// direct-in-place way for the same tree-shaking reason — see either of
// those files' own comment for the full story. App.tsx imports this file
// directly; it is not re-exported from this module's barrel (index.ts).
export const createVerificationServerSource = (): VerificationServerSource => {
    if (import.meta.env.VITE_DATA_ADAPTER === "tauri") return createTauriVerificationServer();
    return createNoopVerificationServer();
};
