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
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
    ticketColumns: DataTableColumn<TicketRow>[];
    visibleRows: TicketRow[];
    summaryColumns: DataTableColumn<SummaryRow>[];
    summaryRows: SummaryRow[];
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Card's body: saved-reports row and the
// active view (Tickets or Summary). The Print/Export button row moved out
// to ReportsScreen's own sticky bottom bar (task: Reports rework, item 3).
export const ReportsCardBody = ({
    savedReportActions,
    view,
    query,
    onQueryChange,
    filter,
    onFilterChange,
    sortKey,
    onSortKeyChange,
    sortDir,
    onSortDirChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    groupBy,
    onGroupByChange,
    ticketColumns,
    visibleRows,
    summaryColumns,
    summaryRows,
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
        />
        {view === "tickets" ? (
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
            />
        ) : (
            <SummaryView
                groupBy={groupBy}
                onGroupByChange={onGroupByChange}
                columns={summaryColumns}
                rows={summaryRows}
            />
        )}
    </div>
);
