import type { WeightUnit } from "@constants/numberFormat";
import { buildReportSlipData } from "@engines/print";
import type { ReportSlipData } from "@engines/print";

import { buildSummaryPrintRows, buildTicketPrintRows } from "../reportPrintRows";
import type { ReportView, SummaryRow, TicketRow } from "../reportRows";

export interface BuildReportsScreenSlipDataArgs {
    view: ReportView;
    summaryRows: SummaryRow[];
    rows: TicketRow[];
    visibleRows: TicketRow[];
    amountDp: 0 | 2;
    lang: string;
    weightUnit: WeightUnit;
    dateFmt: string;
    timeFmt: "24" | "12";
    /** Reports rework, item 3 — `summaryRows`/`visibleRows` are already
     * forced empty while `false` (useReportsScreenData.ts), but `rows`
     * (ungated `dateFilteredRows`) is not — without this, the Summary
     * branch's `rowTimestamps`, and hence the printed slip's date-range
     * header, could still reflect real ungated data while the rows it's
     * printed alongside are empty. Gate `rows` here too so the whole slip
     * — header included — reflects emptiness consistently. */
    reportApplied: boolean;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — mirrors the mock's own repRows(): whichever
// view is open decides both the printed content and which underlying
// rows its date range is computed from (summaryRows isn't affected by
// the tickets view's search/filter, so its range comes from the same
// not-cancelled, both-weights rows summarizeTicketRows itself totals,
// not visibleRows). Unchanged from the inline version it replaces.
export const buildReportsScreenSlipData = ({
    view,
    summaryRows,
    rows,
    visibleRows,
    amountDp,
    lang,
    weightUnit,
    dateFmt,
    timeFmt,
    reportApplied,
}: BuildReportsScreenSlipDataArgs): ReportSlipData => {
    if (view === "summary") {
        const { head, rows: printRows } = buildSummaryPrintRows(summaryRows, amountDp);
        const timestamps = (reportApplied ? rows : [])
            .filter((row) => !row.isCancelled && row.netKg !== null)
            .map((row) => row.at);
        return buildReportSlipData({
            title: "SUMMARY",
            head,
            rows: printRows,
            rowTimestamps: timestamps,
            lang,
            dateFmt,
            timeFmt,
        });
    }
    const { head, rows: printRows } = buildTicketPrintRows(visibleRows, weightUnit);
    return buildReportSlipData({
        title: "TICKET REGISTER",
        head,
        rows: printRows,
        rowTimestamps: visibleRows.map((row) => row.at),
        lang,
        dateFmt,
        timeFmt,
    });
};
