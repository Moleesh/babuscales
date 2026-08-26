// Task #52 — real installed-printer enumeration. Same thin 1:1-wrapper
// shape as @engines/sms (a stateless, one-shot OS query — no
// Context/Provider needed), backed by the Rust `list_printers` command
// (commands/printers.rs, EnumPrintersW).

// PascalCase field names, not the usual TS camelCase — matching
// commands/printers.rs's own `DetectedPrinterDto` (`#[serde(rename_all =
// "PascalCase")]`), the same "PascalCase JSON keys, matching VaultBill"
// convention every other Tauri-command DTO in this codebase follows
// (docs/CodingStandards.md). A lowercase `name` here silently read as
// `undefined` against the real `{"Name": ..., "IsDefault": ...}` wire
// shape — every detected printer disappeared from the dropdown even though
// `list_printers` was returning them correctly (screenshot: dropdown open,
// nothing but "Print to PDF" in it).
export interface DetectedPrinter {
    Name: string;
    /** Windows' own current default printer (`GetDefaultPrinterW`, devices/printers.rs) — used to preselect the single printer dropdown on first load before an operator has ever chosen one. Always `false` on the web/Pages noop build. */
    IsDefault: boolean;
}

export interface PrinterSource {
    /** Printers Windows currently has installed — the same set the OS's own print dialog offers. Empty (not an error) when there are none, or on the web/Pages build. */
    listPrinters: () => Promise<DetectedPrinter[]>;
}
