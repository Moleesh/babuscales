import { formatDateInFmt, formatDateTimeInFmt } from "@constants/numberFormat";

import type { ReportSlipData } from "./types";

export interface ReportSlipInput {
    /** "TICKET REGISTER" or "SUMMARY". */
    title: string;
    head: string[];
    rows: string[][];
    /** ISO timestamps of every row contributing to `rows` — used to compute the real min–max date range shown on the slip, not a fabricated one (see ReportSlipData's own comment). */
    rowTimestamps: string[];
    /** i18n's active language — decides the locale DateRange/PrintedAt render in. */
    lang: string;
    /** Settings' `Formats.DateFmt`. */
    dateFmt: string;
    /** Settings' `Formats.TimeFmt`. */
    timeFmt: "24" | "12";
    /** The "printed at" reference instant — injected rather than read via `new Date()` here (docs/CodingStandards.md §2), so this stays testable without mocking global time. */
    now: Date;
}

const dateRangeOf = (timestamps: string[], lang: string, dateFmt: string): string => {
    if (timestamps.length === 0) return "No tickets";
    const sorted = [...timestamps].sort();
    const earliest = sorted.at(0);
    const latest = sorted.at(-1);
    if (earliest === undefined || latest === undefined) return "No tickets";
    return earliest === latest
        ? formatDateInFmt(earliest, lang, dateFmt)
        : `${formatDateInFmt(earliest, lang, dateFmt)} – ${formatDateInFmt(latest, lang, dateFmt)}`;
};

// Mirrors buildSlipData.ts's role for the per-ticket slip: turns already-
// reduced, feature-owned data (reportPrintRows.ts's {head, rows}) into the
// flat, fully-formatted content model every report paper-size renderer
// consumes.
export const buildReportSlipData = (input: ReportSlipInput): ReportSlipData => ({
    Title: input.title,
    DateRange: dateRangeOf(input.rowTimestamps, input.lang, input.dateFmt),
    Head: input.head,
    Rows: input.rows,
    PrintedAt: formatDateTimeInFmt(input.now, input.lang, input.dateFmt, input.timeFmt),
});
