import type { DataTableColumn } from "@components/DataTable";
import type { ReportSlipData } from "@engines/print";

import { exportReportCsv, exportReportXlsx } from "./reportExport";
import { ReportsActionsRow } from "./ReportsActionsRow";
import { SavedReportsRow } from "./SavedReportsRow";
import { SummaryView } from "./SummaryView";
import { TicketsView } from "./TicketsView";
import type { UseSavedReportActions } from "./useSavedReportActions";
import type { GroupKey, ReportView, SummaryRow, TicketRow, TicketRowFilter } from "../reportRows";
import styles from "../ReportsScreen.module.css";

export interface ReportsCardBodyProps {
    savedReportActions: UseSavedReportActions;
    view: ReportView;
    query: string;
    onQueryChange: (query: string) => void;
    filter: TicketRowFilter;
    onFilterChange: (filter: TicketRowFilter) => void;
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
    ticketColumns: DataTableColumn<TicketRow>[];
    visibleRows: TicketRow[];
    summaryColumns: DataTableColumn<SummaryRow>[];
    summaryRows: SummaryRow[];
    reportSlipData: ReportSlipData;
    onPrint: () => void;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Card's body: saved-reports row, the
// active view (Tickets or Summary), and the Print/Export button row,
// unchanged from the inline version it replaces.
export const ReportsCardBody = ({
    savedReportActions,
    view,
    query,
    onQueryChange,
    filter,
    onFilterChange,
    groupBy,
    onGroupByChange,
    ticketColumns,
    visibleRows,
    summaryColumns,
    summaryRows,
    reportSlipData,
    onPrint,
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
        {view === "tickets" ? (
            <TicketsView
                query={query}
                onQueryChange={onQueryChange}
                filter={filter}
                onFilterChange={onFilterChange}
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
        <ReportsActionsRow
            onPrint={onPrint}
            onExportXlsx={() => exportReportXlsx(reportSlipData)}
            onExportCsv={() => exportReportCsv(reportSlipData)}
        />
    </div>
);
