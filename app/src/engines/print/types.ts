// "One content model, three layout engines" — the mock's own comment
// (demo/BabuScales-demo.html, just above `ticketA4`). `SlipData` is that one
// content model: everything a printed ticket needs, already formatted to
// strings so the render functions do no further rounding/locale work.
export interface SlipData {
    TicketNo: string;
    VehicleNo: string;
    Party: string;
    Material: string;
    ChallanNo: string;
    Transporter: string;
    TareKg: string;
    GrossKg: string;
    NetKg: string;
    TareAt: string;
    GrossAt: string;
    /**
     * The ticket's Gross capture, as a length-1 (or length-0, before it's
     * captured) array — mirrors weighing/_private/CalcFormula's own
     * `grossWeightsKg` convention. Every renderer treats length <= 1 as
     * "nothing to itemise".
     */
    GrossLoads: { Kg: string; At: string }[];
    /** Pre-formatted money (engines/billing) — "—" until both weights are in. */
    Charge: string;
    Operator: string;
    /** "" for the first print, "DUPLICATE COPY N" after — mirrors the mock's `state.prints`/`p.copy`. */
    Copy: string;
    /** The ticket's QR-verification page URL (@engines/verification, PLAN §18), or null when the feature is off / unavailable (Settings → Connections → Integrations → "QR verification page", or the GitHub Pages/memory-adapter build). Never fabricated — see SlipA4's own comment on why the mock's always-on placeholder line was dropped. */
    VerifyUrl: string | null;
}

export const PAPER_KINDS = ["a4", "th", "mx"] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];

// The bulk-register/summary print's own content model — mirrors the mock's
// `repRows()` return shape (`{head, rows}`), which is deliberately a
// narrower, print-specific column set than either on-screen table
// (ReportsScreen.tsx's `ticketColumns`/`summaryColumns`), same as `SlipData`
// above is narrower than the live ticket form. `Head`/`Rows` are generic
// strings — feature/reports' reportPrintRows.ts does the reduction from
// `TicketRow[]`/`SummaryRow[]`, keeping this engine ignorant of those types.
export interface ReportSlipData {
    /** "TICKET REGISTER" or "SUMMARY" — mock's own two titles. */
    Title: string;
    /** The real earliest–latest timestamp span of the printed rows, not a fabricated one — this app has no date-range filter yet (the mock's `rFrom`/`rTo` inputs), so there is nothing honest to put here except what the data itself spans. */
    DateRange: string;
    Head: string[];
    Rows: string[][];
    PrintedAt: string;
}
