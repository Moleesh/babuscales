import type { ReportSlipData } from "@engines/print";

import { ReportBuilderModal } from "./ReportBuilderModal";
import { exportReportCsv, exportReportXlsx } from "./reportExport";
import { ReportPrintModal } from "./ReportPrintModal";
import { ReportsActionsRow } from "./ReportsActionsRow";
import { TicketsPaginationRow } from "./TicketsView";
import type { UseSavedReportActions } from "./useSavedReportActions";
import styles from "../_styles/ReportsScreen.module.css";
import type { GroupKey, ReportView, TicketColumnKey, TicketRowFilter } from "../reportRows";

export interface ReportsScreenOverlaysProps {
    reportSlipData: ReportSlipData;
    printOpen: boolean;
    onPrintOpenChange: (open: boolean) => void;
    builderOpen: boolean;
    onBuilderOpenChange: (open: boolean) => void;
    view: ReportView;
    onViewChange: (view: ReportView) => void;
    /** Tickets pagination — only rendered in the bottom bar when `view === "tickets"`. See reportRows.ts's `paginateTicketRows`. */
    pageIndex: number;
    pageCount: number;
    onPageIndexChange: (pageIndex: number) => void;
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
    filter: TicketRowFilter;
    onFilterChange: (filter: TicketRowFilter) => void;
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
    visibleColumnKeys: TicketColumnKey[] | null;
    onVisibleColumnKeysChange: (keys: TicketColumnKey[] | null) => void;
    savedReportActions: UseSavedReportActions;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — everything ReportsScreen renders outside the
// Card: the sticky bottom Print/Export bar
// and the two modals (print preview, report-builder wizard).
export const ReportsScreenOverlays = ({
    reportSlipData,
    printOpen,
    onPrintOpenChange,
    builderOpen,
    onBuilderOpenChange,
    view,
    onViewChange,
    groupBy,
    onGroupByChange,
    filter,
    onFilterChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    visibleColumnKeys,
    onVisibleColumnKeysChange,
    savedReportActions,
    pageIndex,
    pageCount,
    onPageIndexChange,
}: ReportsScreenOverlaysProps) => (
    <>
        {/* `.main`'s scroll container (AppShell.module.css) is what this
            bar's `position: sticky` sticks against. Tickets pagination sits
            on the right, opposite Print/Export — task: "put the page bar
            to the footer" — so it's always reachable without scrolling back
            up past a short last page, and never disappears once the inner
            table's own scroll region was removed (ReportsScreen.module.css's
            `.tickets-table`). */}
        <div className={styles.bottomBar}>
            <ReportsActionsRow
                onPrint={() => onPrintOpenChange(true)}
                onExportXlsx={() => exportReportXlsx(reportSlipData)}
                onExportCsv={() => exportReportCsv(reportSlipData)}
            />
            {view === "tickets" && (
                <TicketsPaginationRow
                    pageIndex={pageIndex}
                    pageCount={pageCount}
                    onPageIndexChange={onPageIndexChange}
                />
            )}
        </div>
        <ReportPrintModal
            open={printOpen}
            onClose={() => onPrintOpenChange(false)}
            data={reportSlipData}
        />
        <ReportBuilderModal
            open={builderOpen}
            onClose={() => onBuilderOpenChange(false)}
            view={view}
            onViewChange={onViewChange}
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
            filter={filter}
            onFilterChange={onFilterChange}
            dateFrom={dateFrom}
            onDateFromChange={onDateFromChange}
            dateTo={dateTo}
            onDateToChange={onDateToChange}
            visibleColumnKeys={visibleColumnKeys}
            onVisibleColumnKeysChange={onVisibleColumnKeysChange}
            newReportName={savedReportActions.newReportName}
            onNewReportNameChange={savedReportActions.setNewReportName}
            onSaveReport={savedReportActions.handleSaveReport}
        />
    </>
);
