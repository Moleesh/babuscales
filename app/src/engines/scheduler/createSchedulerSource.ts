import { createNoopScheduler } from "./noopScheduler";
import { createTauriScheduler } from "./tauriScheduler";
import type { SchedulerSource } from "./types";

// Same build-time branch as db/createDataPort.ts and every other
// @engines/*/createXSource.ts — tested the same direct-in-place way for the
// same tree-shaking reason (see db/createDataPort.ts's own comment for the
// full story). Not re-exported from this module's barrel; App.tsx imports
// it directly, same as @engines/licensing/@engines/tunnel's own factories.
export const createSchedulerSource = (): SchedulerSource => {
    if (import.meta.env.VITE_DATA_ADAPTER === "tauri") return createTauriScheduler();
    return createNoopScheduler();
};
