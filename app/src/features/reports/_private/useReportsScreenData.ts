import { useMemo } from "react";

import type { DataTableColumn } from "@components/DataTable";
import type { WeightUnit } from "@constants/numberFormat";
import type { DocRow } from "@db/types";

import { buildSummaryColumns, buildTicketColumns } from "./reportColumns";
import { buildReportsScreenSlipData } from "./reportSlipData";
import {
    buildTicketRows,
    filterRowsByDateRange,
    filterRowsBySeries,
    filterTicketRows,
    paginateTicketRows,
    sortTicketRows,
    summarizeTicketRows,
    ticketPageCount,
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
    /** `Numbering.CurrentEpoch` — the epoch `filterRowsBySeries` treats as "current". */
    currentEpoch: number;
    /** Reports' own "include tickets from before the last reset" toggle — true is a no-op (filterRowsBySeries). */
    includeBacked: boolean;
    groupBy: GroupKey;
    sortKey: TicketSortKey;
    sortDir: SortDir;
    /** Tickets view's current page (0-based) — see reportRows.ts's `paginateTicketRows`. */
    pageIndex: number;
    visibleColumnKeys: TicketColumnKey[] | null;
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    weightUnit: WeightUnit;
    dateFmt: string;
    timeFmt: "24" | "12";
    styles: CSSModuleClasses;
    t: Translate;
    lang: string;
}

export interface UseReportsScreenData {
    waitingCount: number;
    visibleRows: TicketRow[];
    /** The one page of `visibleRows` DataTable actually renders — see reportRows.ts's `paginateTicketRows`. */
    pagedRows: TicketRow[];
    pageCount: number;
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
    currentEpoch,
    includeBacked,
    groupBy,
    sortKey,
    sortDir,
    pageIndex,
    visibleColumnKeys,
    onOpenTicket,
    amountDp,
    weightUnit,
    dateFmt,
    timeFmt,
    styles,
    t,
    lang,
}: UseReportsScreenDataArgs): UseReportsScreenData => {
    const rows = useMemo(() => buildTicketRows(docs), [docs]);
    // The open-ticket strip is a global "what's waiting right
    // now" indicator, not scoped to whatever date range Reports happens to
    // have selected, so this reads the full unfiltered `rows`, not
    // `dateFilteredRows` below.
    const waitingCount = useMemo(() => rows.filter((row) => row.isOpen).length, [rows]);
    const seriesFilteredRows = useMemo(
        () => filterRowsBySeries(rows, currentEpoch, includeBacked),
        [rows, currentEpoch, includeBacked],
    );
    const dateFilteredRows = useMemo(
        () => filterRowsByDateRange(seriesFilteredRows, dateFrom, dateTo),
        [seriesFilteredRows, dateFrom, dateTo],
    );
    const visibleRows = useMemo(
        () => sortTicketRows(filterTicketRows(dateFilteredRows, query, filter), sortKey, sortDir),
        [dateFilteredRows, query, filter, sortKey, sortDir],
    );
    const pageCount = useMemo(() => ticketPageCount(visibleRows.length), [visibleRows]);
    const pagedRows = useMemo(
        () => paginateTicketRows(visibleRows, pageIndex),
        [visibleRows, pageIndex],
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
                lang,
                weightUnit,
                dateFmt,
                timeFmt,
            }),
        [view, summaryRows, dateFilteredRows, visibleRows, amountDp, lang, weightUnit, dateFmt, timeFmt],
    );
    const ticketColumns = useMemo(
        () =>
            buildTicketColumns({
                onOpenTicket,
                amountDp,
                weightUnit,
                styles,
                t,
                lang,
                dateFmt,
                timeFmt,
                visibleColumnKeys,
            }),
        [onOpenTicket, amountDp, weightUnit, styles, t, lang, dateFmt, timeFmt, visibleColumnKeys],
    );
    const summaryColumns = useMemo(
        () => buildSummaryColumns({ groupBy, amountDp, t }),
        [groupBy, amountDp, t],
    );

    return {
        waitingCount,
        visibleRows,
        pagedRows,
        pageCount,
        summaryRows,
        reportSlipData,
        ticketColumns,
        summaryColumns,
    };
};
