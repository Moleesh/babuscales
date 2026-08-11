import { useMemo } from "react";

import type { DataTableColumn } from "@components/DataTable";
import type { DocRow } from "@db/types";

import { buildSummaryColumns, buildTicketColumns } from "./reportColumns";
import { buildReportsScreenSlipData } from "./reportSlipData";
import { buildTicketRows, filterTicketRows, summarizeTicketRows } from "../reportRows";
import type { GroupKey, ReportView, SummaryRow, TicketRow, TicketRowFilter } from "../reportRows";

export interface UseReportsScreenDataArgs {
    docs: DocRow[];
    view: ReportView;
    query: string;
    filter: TicketRowFilter;
    groupBy: GroupKey;
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    styles: CSSModuleClasses;
}

export interface UseReportsScreenData {
    waitingCount: number;
    visibleRows: TicketRow[];
    summaryRows: SummaryRow[];
    reportSlipData: ReturnType<typeof buildReportsScreenSlipData>;
    ticketColumns: DataTableColumn<TicketRow>[];
    summaryColumns: DataTableColumn<SummaryRow>[];
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the docs -> rows -> {filtered rows, grouped
// summary, print/export slip data, table columns} derivation chain,
// unchanged from the inline version it replaces.
export const useReportsScreenData = ({
    docs,
    view,
    query,
    filter,
    groupBy,
    onOpenTicket,
    amountDp,
    styles,
}: UseReportsScreenDataArgs): UseReportsScreenData => {
    const rows = useMemo(() => buildTicketRows(docs), [docs]);
    const waitingCount = useMemo(() => rows.filter((row) => row.isOpen).length, [rows]);
    const visibleRows = useMemo(() => filterTicketRows(rows, query, filter), [rows, query, filter]);
    const summaryRows = useMemo(() => summarizeTicketRows(rows, groupBy), [rows, groupBy]);
    const reportSlipData = useMemo(
        () => buildReportsScreenSlipData({ view, summaryRows, rows, visibleRows, amountDp }),
        [view, summaryRows, rows, visibleRows, amountDp],
    );
    const ticketColumns = useMemo(
        () => buildTicketColumns({ onOpenTicket, amountDp, styles }),
        [onOpenTicket, amountDp, styles],
    );
    const summaryColumns = useMemo(() => buildSummaryColumns({ groupBy, amountDp }), [groupBy, amountDp]);

    return { waitingCount, visibleRows, summaryRows, reportSlipData, ticketColumns, summaryColumns };
};
