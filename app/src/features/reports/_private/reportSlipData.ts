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
}: BuildReportsScreenSlipDataArgs): ReportSlipData => {
    if (view === "summary") {
        const { head, rows: printRows } = buildSummaryPrintRows(summaryRows, amountDp);
        const timestamps = rows
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
