import { invoke } from "@tauri-apps/api/core";

import type { DetectedPrinter, PrinterSource } from "./types";

// Only ever imported from createPrinterSource.ts's guarded branch — same
// tree-shaking guarantee as @engines/sms/tauriSms.ts's own comment.
export const createTauriPrinters = (): PrinterSource => ({
    listPrinters: () => invoke<DetectedPrinter[]>("list_printers"),
});
