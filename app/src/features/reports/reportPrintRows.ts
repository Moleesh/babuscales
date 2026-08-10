import { formatMoney, formatWeightKg } from "@constants/numberFormat";
import { formatTicketNo } from "@features/weighing";

import type { SummaryRow, TicketRow } from "./reportRows";

/** The generic {head, rows} shape engines/print's report renderers consume — mirrors the mock's own `repRows()`, which reduces to a print-specific column set narrower than either on-screen table (ReportsScreen.tsx's `ticketColumns`/`summaryColumns`). Notably the mock's own ticket-register print has no Charge column at all, unlike its Summary print — an inconsistency in the mock, ported faithfully rather than "fixed" (PLAN §22: the mock wins on look/behavior). */
export interface ReportPrintRows {
    head: string[];
    rows: string[][];
}

export const buildTicketPrintRows = (rows: TicketRow[]): ReportPrintRows => ({
    head: ["Ticket", "Vehicle", "Party", "Net kg"],
    rows: rows.map((row) => [
        formatTicketNo(row.docSeq),
        row.vehicleNo || "—",
        row.party || "—",
        row.isCancelled ? "CANCELLED" : row.netKg !== null ? formatWeightKg(row.netKg) : "open",
    ]),
});

export const buildSummaryPrintRows = (rows: SummaryRow[], amountDp: 0 | 2): ReportPrintRows => ({
    head: ["Group", "Tkts", "Net t", "Charge"],
    rows: rows.map((row) => [
        row.key,
        String(row.ticketCount),
        row.netTonnes.toFixed(1),
        formatMoney(row.charge, amountDp),
    ]),
});
