import type { DataTableColumn } from "@components/DataTable";

import { ReportsDateRangeRow } from "./ReportsDateRangeRow";
import { SavedReportsRow } from "./SavedReportsRow";
import { SummaryView } from "./SummaryView";
import { TicketsView } from "./TicketsView";
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
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
    ticketColumns: DataTableColumn<TicketRow>[];
    visibleRows: TicketRow[];
    summaryColumns: DataTableColumn<SummaryRow>[];
    summaryRows: SummaryRow[];
}

type ReportsActiveViewProps = Pick<
    ReportsCardBodyProps,
    | "loading"
    | "view"
    | "query"
    | "onQueryChange"
    | "filter"
    | "onFilterChange"
    | "sortKey"
    | "onSortKeyChange"
    | "sortDir"
    | "onSortDirChange"
    | "groupBy"
    | "onGroupByChange"
    | "ticketColumns"
    | "visibleRows"
    | "summaryColumns"
    | "summaryRows"
>;

// Split out of ReportsCardBody (over the line/complexity budget —
// docs/CodingStandards.md) — the Tickets/Summary view switch itself.
const ReportsActiveView = ({
    loading,
    view,
    query,
    onQueryChange,
    filter,
    onFilterChange,
    sortKey,
    onSortKeyChange,
    sortDir,
    onSortDirChange,
    groupBy,
    onGroupByChange,
    ticketColumns,
    visibleRows,
    summaryColumns,
    summaryRows,
}: ReportsActiveViewProps) =>
    view === "tickets" ? (
        <TicketsView
            query={query}
            onQueryChange={onQueryChange}
            filter={filter}
            onFilterChange={onFilterChange}
            sortKey={sortKey}
            onSortKeyChange={onSortKeyChange}
            sortDir={sortDir}
            onSortDirChange={onSortDirChange}
            columns={ticketColumns}
            rows={visibleRows}
            loading={loading}
        />
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
// to ReportsScreen's own sticky bottom bar (task: Reports rework, item 3).
export const ReportsCardBody = ({
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    includeBacked,
    onIncludeBackedChange,
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
        <ReportsDateRangeRow
            dateFrom={dateFrom}
            onDateFromChange={onDateFromChange}
            dateTo={dateTo}
            onDateToChange={onDateToChange}
            includeBacked={includeBacked}
            onIncludeBackedChange={onIncludeBackedChange}
        />
        <ReportsActiveView {...view} />
    </div>
);
