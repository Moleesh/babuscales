import { useMemo } from "react";

import type { DataTableColumn } from "@components/DataTable";
import type { DocRow } from "@db/types";

import { buildSummaryColumns, buildTicketColumns } from "./reportColumns";
import { buildReportsScreenSlipData } from "./reportSlipData";
import {
    buildTicketRows,
    filterRowsByDateRange,
    filterTicketRows,
    sortTicketRows,
    summarizeTicketRows,
} from "../reportRows";
import type {
    GroupKey,
    ReportView,
    SortDir,
    SummaryRow,
    TicketColumnKey,
    TicketRow,
    TicketRowFilter,
    TicketSortKey,
    Translate,
} from "../reportRows";

export interface UseReportsScreenDataArgs {
    docs: DocRow[];
    view: ReportView;
    query: string;
    filter: TicketRowFilter;
    dateFrom: string;
    dateTo: string;
    groupBy: GroupKey;
    sortKey: TicketSortKey;
    sortDir: SortDir;
    visibleColumnKeys: TicketColumnKey[] | null;
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    styles: CSSModuleClasses;
    t: Translate;
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
    dateFrom,
    dateTo,
    groupBy,
    sortKey,
    sortDir,
    visibleColumnKeys,
    onOpenTicket,
    amountDp,
    styles,
    t,
}: UseReportsScreenDataArgs): UseReportsScreenData => {
    const rows = useMemo(() => buildTicketRows(docs), [docs]);
    // PLAN §7.5 — the open-ticket strip is a global "what's waiting right
    // now" indicator, not scoped to whatever date range Reports happens to
    // have selected, so this reads the full unfiltered `rows`, not
    // `dateFilteredRows` below.
    const waitingCount = useMemo(() => rows.filter((row) => row.isOpen).length, [rows]);
    const dateFilteredRows = useMemo(
        () => filterRowsByDateRange(rows, dateFrom, dateTo),
        [rows, dateFrom, dateTo],
    );
    const visibleRows = useMemo(
        () => sortTicketRows(filterTicketRows(dateFilteredRows, query, filter), sortKey, sortDir),
        [dateFilteredRows, query, filter, sortKey, sortDir],
    );
    const summaryRows = useMemo(
        () => summarizeTicketRows(dateFilteredRows, groupBy),
        [dateFilteredRows, groupBy],
    );
    const reportSlipData = useMemo(
        () =>
            buildReportsScreenSlipData({
                view,
                summaryRows,
                rows: dateFilteredRows,
                visibleRows,
                amountDp,
            }),
        [view, summaryRows, dateFilteredRows, visibleRows, amountDp],
    );
    const ticketColumns = useMemo(
        () => buildTicketColumns({ onOpenTicket, amountDp, styles, t, visibleColumnKeys }),
        [onOpenTicket, amountDp, styles, t, visibleColumnKeys],
    );
    const summaryColumns = useMemo(
        () => buildSummaryColumns({ groupBy, amountDp, t }),
        [groupBy, amountDp, t],
    );

    return {
        waitingCount,
        visibleRows,
        summaryRows,
        reportSlipData,
        ticketColumns,
        summaryColumns,
    };
};
