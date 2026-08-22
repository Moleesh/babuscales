// Formatting only — the number itself comes from `DataPort.allocateDocSeq`,
// called once at first Save — "at close, never at draft".

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

// Same "no React context at these call sites" reasoning as
// `activeFormat`/`setTicketNumberFormat` above — bug fix: this was a bare
// "Draft" literal, never localized even in the Tamil UI. I18nProvider
// pushes the translated string here on every language change.
let activeDraftLabel = "Draft";

export const setTicketNumberDraftLabel = (label: string): void => {
    activeDraftLabel = label;
};

// Exposed for ReprintLookupModal to pre-fill its ticket-number field with
// the site's own configured prefix (task: "auto populate the prefix in the
// reprint pop") — the operator only has to type the numeric part.
export const getTicketNumberPrefix = (): string => activeFormat.prefix;

export const formatTicketNo = (docSeq: number | null): string =>
    docSeq === null
        ? activeDraftLabel
        : `${activeFormat.prefix}${String(docSeq).padStart(activeFormat.width, "0")}`;
