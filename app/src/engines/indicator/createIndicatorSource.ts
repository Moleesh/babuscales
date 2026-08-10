import { createSerialIndicator } from "./serialIndicator";
import { createSimulatedIndicator } from "./simulatedIndicator";
import type { IndicatorSource } from "./types";

// Same build-time branch as db/createDataPort.ts, verified the same way:
// `import.meta.env.VITE_DATA_ADAPTER === "tauri"` must be tested directly,
// in place, with no helper function or parameter in between, or Rollup
// can't prove the other branch — createSerialIndicator, and everything
// under @tauri-apps/api with it — is unreachable and drop it from the
// Pages build. See createDataPort.ts's own comment for the full story of
// why (an earlier version of that indirection was checked against the
// actual built output and found to NOT tree-shake).
//
// Not exported from this module's barrel (index.ts) for the same reason
// createDataPort isn't exported from any @db barrel: App.tsx imports this
// file directly (`@engines/indicator/createIndicatorSource`), so nothing
// re-exports createSerialIndicator through a path a memory-build file
// might import for an unrelated reason.
export const createIndicatorSource = (): IndicatorSource => {
    if (import.meta.env.VITE_DATA_ADAPTER === "tauri") return createSerialIndicator();
    return createSimulatedIndicator();
};
