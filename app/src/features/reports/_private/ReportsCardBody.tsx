import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import type { DataTableColumn } from "@components/DataTable";

import { ReportsDateRangeRow } from "./ReportsDateRangeRow";
import { SavedReportsRow } from "./SavedReportsRow";
import { SummaryView } from "./SummaryView";
import { TicketsFilterRow, TicketsView } from "./TicketsView";
import type { UseSavedReportActions } from "./useSavedReportActions";
import styles from "../_styles/ReportsScreen.module.css";
import type {
    GroupKey,
    ReportView,
    SeriesEpochOption,
    SortDir,
    SummaryRow,
    TicketRow,
    TicketRowFilter,
    TicketRowFilterCounts,
    TicketSortKey,
} from "../reportRows";

export interface ReportsCardBodyProps {
    /** True until the ticket docs behind Tickets/Summary have loaded once. */
    loading: boolean;
    /** Reports rework, item 3 — `false` until the operator explicitly asks
     * for a report; drives the "select a saved view or build a report"
     * empty state below instead of the usual "nothing matches" one. */
    reportApplied: boolean;
    savedReportActions: UseSavedReportActions;
    /** Task: "edit save report should open the create report in edit form" —
     * SavedReportsRow's pencil action now opens the builder pre-filled,
     * instead of an inline rename box. */
    onEditSavedReport: (id: string) => void;
    view: ReportView;
    query: string;
    onQueryChange: (query: string) => void;
    filter: TicketRowFilter;
    onFilterChange: (filter: TicketRowFilter) => void;
    sortKey: TicketSortKey;
    onSortKeyChange: (sortKey: TicketSortKey) => void;
    sortDir: SortDir;
    onSortDirChange: (sortDir: SortDir) => void;
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
    /** Reports' "include tickets from before the last reset" dropdown — see reportRows.ts's `filterRowsBySeries`/`listSeriesEpochOptions`. */
    seriesEpoch: number | "current" | "all";
    onSeriesEpochChange: (epoch: number | "current" | "all") => void;
    seriesEpochOptions: SeriesEpochOption[];
    /** Settings' `Rules.ShowSeriesInReports` — task: "Add a config for
     * showing the series in report, only then user can use it, it hidden
     * behind the flag". Off (default): the Series dropdown is withheld from
     * ReportsDateRangeRow entirely (it self-hides when
     * `onSeriesEpochChange`/`seriesEpochOptions` are absent) — Reports stays
     * on its current-series default with no control to change it. */
    showSeriesEpoch: boolean;
    /** Settings' `Formats.DateFmt`, passed straight through to ReportsDateRangeRow's DatePicker pair. */
    dateFmt: string;
    /** Per-status sub-counts (All/Waiting/Both) for the Tickets filter chips
     * — see useReportsScreenData.ts's own `filterCounts`. */
    filterCounts: TicketRowFilterCounts;
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
    ticketColumns: DataTableColumn<TicketRow>[];
    /** Tickets view's current page only — see reportRows.ts's `paginateTicketRows`. Print/Export read `visibleRows` (the full set) separately, not this. The Prev/Next control itself lives in the sticky bottom bar (ReportsScreenOverlays.tsx), not here. */
    pagedRows: TicketRow[];
    summaryColumns: DataTableColumn<SummaryRow>[];
    summaryRows: SummaryRow[];
}

type ReportsActiveViewProps = Pick<
    ReportsCardBodyProps,
    | "loading"
    | "reportApplied"
    | "view"
    | "groupBy"
    | "onGroupByChange"
    | "ticketColumns"
    | "pagedRows"
    | "summaryColumns"
    | "summaryRows"
>;

// Split out of ReportsCardBody (over the line/complexity budget —
// docs/CodingStandards.md) — the Tickets/Summary view switch itself. Just
// the table now — TicketsView's search/filter/sort row moved out to the
// sticky wrapper above (ReportsCardBody's own `.sticky-filters`).
const ReportsActiveView = ({
    loading,
    reportApplied,
    view,
    groupBy,
    onGroupByChange,
    ticketColumns,
    pagedRows,
    summaryColumns,
    summaryRows,
}: ReportsActiveViewProps) =>
    view === "tickets" ? (
        <TicketsView columns={ticketColumns} rows={pagedRows} loading={loading} reportApplied={reportApplied} />
    ) : (
        <SummaryView
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
            columns={summaryColumns}
            rows={summaryRows}
            loading={loading}
            reportApplied={reportApplied}
        />
    );

// Exposes `.sticky-filters`' own rendered height as `--reports-filters-h` on
// `.body` — the Tickets table's column header row (DataTable.module.css's
// `--datatable-header-top`, via ReportsScreen.module.css's `.tickets-table`)
// offsets its own sticky `top` by this, on top of the shell's own
// `--shell-header-h`, so it stacks under both instead of colliding with
// either at the same `top: 0` slot. Same ResizeObserver shape as
// AppShell.tsx's own `useStickyHeaderHeight`. Split out purely to stay under
// the file's own line budget.
const useStickyFiltersHeight = (
    bodyRef: RefObject<HTMLDivElement | null>,
    filtersRef: RefObject<HTMLDivElement | null>,
): void => {
    useEffect(() => {
        const bodyEl = bodyRef.current;
        const filtersEl = filtersRef.current;
        if (!bodyEl || !filtersEl) return;
        // `entry.contentRect` is `.stickyFilters`' own *content* box — it
        // excludes that element's own `padding-block: 4px 6px`
        // (ReportsScreen.module.css), undercounting its real rendered
        // height by 10px, so the table below kept rendering 10px too tall
        // for the room actually left under it (task: "still some more
        // scrolling", same root cause as Card.tsx's own `--card-header-h`
        // fix). Reading the real border-box height directly instead.
        const observer = new ResizeObserver(() => {
            bodyEl.style.setProperty("--reports-filters-h", `${filtersEl.getBoundingClientRect().height}px`);
        });
        observer.observe(filtersEl);
        return () => observer.disconnect();
    }, [bodyRef, filtersRef]);
};

type ReportsFilterBarProps = Pick<
    ReportsCardBodyProps,
    | "dateFrom"
    | "onDateFromChange"
    | "dateTo"
    | "onDateToChange"
    | "seriesEpoch"
    | "onSeriesEpochChange"
    | "seriesEpochOptions"
    | "showSeriesEpoch"
    | "dateFmt"
    | "savedReportActions"
    | "onEditSavedReport"
    | "reportApplied"
>;

// The saved-views dropdown + date-range/series row — pulled out of
// ReportsCardBody purely to stay under its own line budget.
const ReportsFilterBar = ({
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    seriesEpoch,
    onSeriesEpochChange,
    seriesEpochOptions,
    showSeriesEpoch,
    dateFmt,
    savedReportActions,
    onEditSavedReport,
    reportApplied,
}: ReportsFilterBarProps) => (
    <div className={styles.filterBar}>
        <SavedReportsRow
            savedReports={savedReportActions.savedReports}
            selectedId={savedReportActions.selectedId}
            // Bug: "if we change any quick filter it goes back to select
            // saved instead of saying dynamic" — `reportApplied` is exactly
            // "a report was explicitly asked for at some point and has never
            // gone back to the empty state" (useReportsScreenController.ts's
            // own doc comment on it), so `selectedId === null` alongside it
            // means "diverged from that report", not "never picked one".
            dynamic={reportApplied}
            onRecall={savedReportActions.handleRecallReport}
            onDelete={savedReportActions.handleDeleteReport}
            onEdit={onEditSavedReport}
        />
        <ReportsDateRangeRow
            dateFrom={dateFrom}
            onDateFromChange={onDateFromChange}
            dateTo={dateTo}
            onDateToChange={onDateToChange}
            seriesEpoch={showSeriesEpoch ? seriesEpoch : undefined}
            onSeriesEpochChange={showSeriesEpoch ? onSeriesEpochChange : undefined}
            seriesEpochOptions={showSeriesEpoch ? seriesEpochOptions : undefined}
            dateFmt={dateFmt}
        />
    </div>
);

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Card's body: saved-reports row and the
// active view (Tickets or Summary). The Print/Export button row moved out
// to ReportsScreen's own sticky bottom bar.
export const ReportsCardBody = ({
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    seriesEpoch,
    onSeriesEpochChange,
    seriesEpochOptions,
    showSeriesEpoch,
    dateFmt,
    filterCounts,
    savedReportActions,
    onEditSavedReport,
    ...screenState
}: ReportsCardBodyProps) => {
    const bodyRef = useRef<HTMLDivElement>(null);
    const filtersRef = useRef<HTMLDivElement>(null);
    useStickyFiltersHeight(bodyRef, filtersRef);
    return (
        <div className={styles.body} ref={bodyRef}>
        {/* Saved-views dropdown + date range + series filter + (for Tickets)
            the search/filter/sort row all stick together as one compact
            block under the Card's own sticky title header (Card.tsx's
            `sticky` prop) instead of the title scrolling off while just the
            filters stayed pinned below it (task: "make it sticky including
            the title"). The saved-views dropdown and date pickers now share
            one line (Reports rework, item 1) instead of each getting its
            own crowded row. */}
        <div className={styles.stickyFilters} ref={filtersRef}>
            <ReportsFilterBar
                dateFrom={dateFrom}
                onDateFromChange={onDateFromChange}
                dateTo={dateTo}
                onDateToChange={onDateToChange}
                seriesEpoch={seriesEpoch}
                onSeriesEpochChange={onSeriesEpochChange}
                seriesEpochOptions={seriesEpochOptions}
                showSeriesEpoch={showSeriesEpoch}
                dateFmt={dateFmt}
                savedReportActions={savedReportActions}
                onEditSavedReport={onEditSavedReport}
                reportApplied={screenState.reportApplied}
            />
            {screenState.view === "tickets" && (
                <TicketsFilterRow
                    query={screenState.query}
                    onQueryChange={screenState.onQueryChange}
                    filter={screenState.filter}
                    onFilterChange={screenState.onFilterChange}
                    sortKey={screenState.sortKey}
                    onSortKeyChange={screenState.onSortKeyChange}
                    sortDir={screenState.sortDir}
                    onSortDirChange={screenState.onSortDirChange}
                    filterCounts={filterCounts}
                />
            )}
        </div>
        <ReportsActiveView {...screenState} />
        </div>
    );
};
