import { createNoopLicensing } from "./noopLicensing";
import { createTauriLicensing } from "./tauriLicensing";
import type { LicensingSource } from "./types";

// Same build-time branch as db/createDataPort.ts and
// @engines/tunnel/createTunnelSource.ts, tested the same direct-in-place
// way for the same tree-shaking reason — see either of those files' own
// comment for the full story. Not re-exported from this module's barrel
// (index.ts); task #38's provider imports it directly.
export const createLicensingSource = (): LicensingSource => {
    if (import.meta.env.VITE_DATA_ADAPTER === "tauri") return createTauriLicensing();
    return createNoopLicensing();
};
