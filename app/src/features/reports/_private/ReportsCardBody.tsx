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
    SortDir,
    SummaryRow,
    TicketRow,
    TicketRowFilter,
    TicketSortKey,
} from "../reportRows";

export interface ReportsCardBodyProps {
    /** True until the ticket docs behind Tickets/Summary have loaded once. */
    loading: boolean;
    savedReportActions: UseSavedReportActions;
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
    /** Reports' "include tickets from before the last reset" toggle — off by default (reportRows.ts's filterRowsBySeries). */
    includeBacked: boolean;
    onIncludeBackedChange: (includeBacked: boolean) => void;
    /** Settings' `Formats.DateFmt`, passed straight through to ReportsDateRangeRow's DatePicker pair. */
    dateFmt: string;
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
    view,
    groupBy,
    onGroupByChange,
    ticketColumns,
    pagedRows,
    summaryColumns,
    summaryRows,
}: ReportsActiveViewProps) =>
    view === "tickets" ? (
        <TicketsView columns={ticketColumns} rows={pagedRows} loading={loading} />
    ) : (
        <SummaryView
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
            columns={summaryColumns}
            rows={summaryRows}
            loading={loading}
        />
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
    includeBacked,
    onIncludeBackedChange,
    dateFmt,
    savedReportActions,
    ...view
}: ReportsCardBodyProps) => (
    <div className={styles.body}>
        <SavedReportsRow
            savedReports={savedReportActions.savedReports}
            newName={savedReportActions.newReportName}
            onNewNameChange={savedReportActions.setNewReportName}
            onSave={savedReportActions.handleSaveReport}
            onRecall={savedReportActions.handleRecallReport}
            onDelete={savedReportActions.handleDeleteReport}
        />
        {/* Date range + (for Tickets) the search/filter/sort row stick together
            under the shell's own sticky weight header (AppShell.tsx's
            `--shell-header-h`, same fix as Settings' tab bar) so they stay
            reachable while the table underneath scrolls. */}
        <div className={styles.stickyFilters}>
            <ReportsDateRangeRow
                dateFrom={dateFrom}
                onDateFromChange={onDateFromChange}
                dateTo={dateTo}
                onDateToChange={onDateToChange}
                includeBacked={includeBacked}
                onIncludeBackedChange={onIncludeBackedChange}
                dateFmt={dateFmt}
            />
            {view.view === "tickets" && (
                <TicketsFilterRow
                    query={view.query}
                    onQueryChange={view.onQueryChange}
                    filter={view.filter}
                    onFilterChange={view.onFilterChange}
                    sortKey={view.sortKey}
                    onSortKeyChange={view.onSortKeyChange}
                    sortDir={view.sortDir}
                    onSortDirChange={view.onSortDirChange}
                />
            )}
        </div>
        <ReportsActiveView {...view} />
    </div>
);
