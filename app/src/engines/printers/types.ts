// Task #52 — real installed-printer enumeration. Same thin 1:1-wrapper
// shape as @engines/sms (a stateless, one-shot OS query — no
// Context/Provider needed), backed by the Rust `list_printers` command
// (commands/printers.rs, EnumPrintersW).

export interface DetectedPrinter {
    name: string;
}

export interface PrinterSource {
    /** Printers Windows currently has installed — the same set the OS's own print dialog offers. Empty (not an error) when there are none, or on the web/Pages build. */
    listPrinters: () => Promise<DetectedPrinter[]>;
}
