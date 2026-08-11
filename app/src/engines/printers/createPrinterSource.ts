import { createNoopPrinters } from "./noopPrinters";
import { createTauriPrinters } from "./tauriPrinters";
import type { PrinterSource } from "./types";

// Same build-time branch as db/createDataPort.ts and
// @engines/sms/createSmsSource.ts, tested the same direct-in-place way for
// the same tree-shaking reason — see either of those files' own comment
// for the full story. Not re-exported from this module's barrel
// (index.ts); PrintPane.tsx imports it directly.
export const createPrinterSource = (): PrinterSource => {
    if (import.meta.env.VITE_DATA_ADAPTER === "tauri") return createTauriPrinters();
    return createNoopPrinters();
};
