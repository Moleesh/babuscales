import { useMemo } from "react";

import type { DataTableColumn } from "@components/DataTable";
import type { WeightUnit } from "@constants/numberFormat";
import type { DocRow } from "@db/types";
import type { FieldBase } from "@engines/schemaEngine";

import { buildSummaryColumns, buildTicketColumns } from "./reportColumns";
import { buildReportsScreenSlipData } from "./reportSlipData";
import {
    buildTicketRows,
    filterRowsByDateRange,
    filterRowsBySeries,
    filterTicketRows,
    listSeriesEpochOptions,
    paginateTicketRows,
    sortTicketRows,
    summarizeTicketRows,
    ticketPageCount,
} from "../reportRows";
import type {
    GroupKey,
    ReportView,
    SeriesEpochOption,
    SortDir,
    SummaryRow,
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
    /** `Numbering.CurrentEpoch` — what `seriesEpoch === "current"` resolves to. */
    currentEpoch: number;
    /** Reports' own "include tickets from before the last reset" dropdown — `"current"` or a specific prior `SeriesEpoch` (reportRows.ts's `filterRowsBySeries`, scoped to exactly that one series). */
    seriesEpoch: number | "current";
    groupBy: GroupKey;
    sortKey: TicketSortKey;
    sortDir: SortDir;
    /** Tickets view's current page (0-based) — see reportRows.ts's `paginateTicketRows`. */
    pageIndex: number;
    visibleColumnKeys: string[] | null;
    /** Reports rework, item 5 — the ticket schema's own reportable custom
     * fields (reportColumns.tsx's `reportableSchemaFields`), threaded down
     * so a selected field's report column can actually render — see
     * useReportsScreenController.ts's own comment on where this is
     * computed. */
    schemaFields: FieldBase[];
    /** Reports rework, item 3 — `false` until the operator explicitly asks
     * for a report (recall/build/waiting-chip — see
     * useReportsScreenController.ts's own comment on this same flag). While
     * `false`, every derived row list here is forced empty so landing on
     * Reports never shows data nobody asked for yet. */
    reportApplied: boolean;
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
    /** Options for the "include tickets from before the last reset" dropdown — see reportRows.ts's `listSeriesEpochOptions`. */
    seriesEpochOptions: SeriesEpochOption[];
}

interface UseFilteredTicketRowsArgs {
    docs: DocRow[];
    query: string;
    filter: TicketRowFilter;
    dateFrom: string;
    dateTo: string;
    currentEpoch: number;
    seriesEpoch: number | "current";
    groupBy: GroupKey;
    sortKey: TicketSortKey;
    sortDir: SortDir;
    pageIndex: number;
    reportApplied: boolean;
}

// The docs -> rows -> {filtered rows, grouped summary} half of the
// derivation chain — pulled out of useReportsScreenData purely to stay
// under the file's own line budget.
const useFilteredTicketRows = ({
    docs,
    query,
    filter,
    dateFrom,
    dateTo,
    currentEpoch,
    seriesEpoch,
    groupBy,
    sortKey,
    sortDir,
    pageIndex,
    reportApplied,
}: UseFilteredTicketRowsArgs) => {
    const rows = useMemo(() => buildTicketRows(docs), [docs]);
    // The open-ticket strip is a global "what's waiting right
    // now" indicator, not scoped to whatever date range Reports happens to
    // have selected, so this reads the full unfiltered `rows`, not
    // `dateFilteredRows` below.
    const waitingCount = useMemo(() => rows.filter((row) => row.isOpen).length, [rows]);
    const resolvedEpoch = seriesEpoch === "current" ? currentEpoch : seriesEpoch;
    const seriesFilteredRows = useMemo(
        () => filterRowsBySeries(rows, resolvedEpoch),
        [rows, resolvedEpoch],
    );
    const dateFilteredRows = useMemo(
        () => filterRowsByDateRange(seriesFilteredRows, dateFrom, dateTo),
        [seriesFilteredRows, dateFrom, dateTo],
    );
    // Reports rework, item 3 — "there should not be any record without a
    // report being selected". Everything above still runs on the full
    // (unfiltered) `rows`/`waitingCount` — the header's own waiting-count
    // chip is a global indicator, not gated by this — only the two rendered
    // row lists (Tickets/Summary) and their pagination are forced empty.
    const visibleRows = useMemo(
        () => (reportApplied ? sortTicketRows(filterTicketRows(dateFilteredRows, query, filter), sortKey, sortDir) : []),
        [reportApplied, dateFilteredRows, query, filter, sortKey, sortDir],
    );
    const pageCount = useMemo(() => ticketPageCount(visibleRows.length), [visibleRows]);
    const pagedRows = useMemo(() => paginateTicketRows(visibleRows, pageIndex), [visibleRows, pageIndex]);
    const summaryRows = useMemo(
        () => (reportApplied ? summarizeTicketRows(dateFilteredRows, groupBy) : []),
        [reportApplied, dateFilteredRows, groupBy],
    );

    return { waitingCount, rows, dateFilteredRows, visibleRows, pageCount, pagedRows, summaryRows };
};

interface UseReportsTableColumnsArgs {
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    weightUnit: WeightUnit;
    styles: CSSModuleClasses;
    t: Translate;
    lang: string;
    dateFmt: string;
    timeFmt: "24" | "12";
    visibleColumnKeys: string[] | null;
    schemaFields: FieldBase[];
    groupBy: GroupKey;
}

// The ticket/summary DataTable column builders — pulled out of
// useReportsScreenData purely to stay under the file's own line budget.
const useReportsTableColumns = ({
    onOpenTicket,
    amountDp,
    weightUnit,
    styles,
    t,
    lang,
    dateFmt,
    timeFmt,
    visibleColumnKeys,
    schemaFields,
    groupBy,
}: UseReportsTableColumnsArgs) => {
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
                schemaFields,
            }),
        [onOpenTicket, amountDp, weightUnit, styles, t, lang, dateFmt, timeFmt, visibleColumnKeys, schemaFields],
    );
    const summaryColumns = useMemo(() => buildSummaryColumns({ groupBy, amountDp, t }), [groupBy, amountDp, t]);

    return { ticketColumns, summaryColumns };
};

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the docs -> rows -> {filtered rows, grouped
// summary, print/export slip data, table columns} derivation chain,
// unchanged from the inline version it replaces.
export const useReportsScreenData = (args: UseReportsScreenDataArgs): UseReportsScreenData => {
    const { view, amountDp, lang, weightUnit, dateFmt, timeFmt, currentEpoch, t } = args;
    const { waitingCount, rows, dateFilteredRows, visibleRows, pageCount, pagedRows, summaryRows } =
        useFilteredTicketRows(args);
    // Every numbering series actually present on the (unfiltered) docs —
    // feeds the "include tickets from before the last reset" dropdown
    // (ReportsDateRangeRow.tsx). Reads `rows`, not `dateFilteredRows`, so
    // switching series is never itself constrained by whatever series is
    // currently selected.
    const seriesEpochOptions = useMemo(
        () => listSeriesEpochOptions(rows, currentEpoch, t),
        [rows, currentEpoch, t],
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
    const { ticketColumns, summaryColumns } = useReportsTableColumns(args);

    return {
        waitingCount,
        visibleRows,
        pagedRows,
        pageCount,
        summaryRows,
        reportSlipData,
        ticketColumns,
        summaryColumns,
        seriesEpochOptions,
    };
};
