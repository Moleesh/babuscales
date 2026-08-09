// Formatting only — the number itself comes from `DataPort.allocateDocSeq`,
// called once at first Save (PLAN §6.1 — "at close, never at draft").

export interface TicketNumberFormat {
    prefix: string;
    width: number;
}

const DEFAULT_FORMAT: TicketNumberFormat = { prefix: "TKT-", width: 4 };

// `formatTicketNo` is called from small leaf components all over the app
// (OpenTicketStrip, Dashboard's and Reports' tables, WeighingScreen) that
// have no other reason to read Settings — SettingsProvider pushes the live
// prefix/width here once on load and again on every save, rather than
// threading a `TicketNumberFormat` prop through every call site.
let activeFormat: TicketNumberFormat = DEFAULT_FORMAT;

export const setTicketNumberFormat = (format: TicketNumberFormat): void => {
    activeFormat = format;
};

export const formatTicketNo = (docSeq: number | null): string =>
    docSeq === null
        ? "Draft"
        : `${activeFormat.prefix}${String(docSeq).padStart(activeFormat.width, "0")}`;
