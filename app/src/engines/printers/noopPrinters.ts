import type { PrinterSource } from "./types";

// The memory-adapter/GitHub-Pages build: there is no OS printer spooler to
// query from a browser tab, so this honestly reports "none detected"
// rather than pretending — same shape as @engines/sms's noop source.
export const createNoopPrinters = (): PrinterSource => ({
    listPrinters: () => Promise.resolve([]),
});
