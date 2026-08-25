import type { ReportSlipData } from "@engines/print";

import { ReportBuilderModal } from "./ReportBuilderModal";
import { exportReportCsv, exportReportXlsx } from "./reportExport";
import { ReportPrintModal } from "./ReportPrintModal";
import { ReportsActionsRow } from "./ReportsActionsRow";
import { TicketsPaginationRow } from "./TicketsView";
import type { UseSavedReportActions } from "./useSavedReportActions";
import styles from "../_styles/ReportsScreen.module.css";
import type { GroupKey, ReportView, TicketRowFilter } from "../reportRows";

export interface ReportsScreenOverlaysProps {
    reportSlipData: ReportSlipData;
    printOpen: boolean;
    onPrintOpenChange: (open: boolean) => void;
    builderOpen: boolean;
    onBuilderOpenChange: (open: boolean) => void;
    /** Task: "edit save report should open the create report in edit form" —
     * `def.Id` of the saved view being edited, or `null` for a fresh build. */
    editingReportId: string | null;
    view: ReportView;
    /** Tickets pagination — only rendered in the bottom bar when `view === "tickets"`. See reportRows.ts's `paginateTicketRows`. */
    pageIndex: number;
    pageCount: number;
    onPageIndexChange: (pageIndex: number) => void;
    groupBy: GroupKey;
    filter: TicketRowFilter;
    dateFrom: string;
    dateTo: string;
    visibleColumnKeys: string[] | null;
    savedReportActions: UseSavedReportActions;
}

interface ReportsBottomBarProps {
    reportSlipData: ReportSlipData;
    onPrintOpenChange: (open: boolean) => void;
    view: ReportView;
    pageIndex: number;
    pageCount: number;
    onPageIndexChange: (pageIndex: number) => void;
}

// The sticky bottom Print/Export + tickets-pagination bar — pulled out of
// ReportsScreenOverlays purely to stay under the file's own line budget.
const ReportsBottomBar = ({
    reportSlipData,
    onPrintOpenChange,
    view,
    pageIndex,
    pageCount,
    onPageIndexChange,
}: ReportsBottomBarProps) => (
    // `.main`'s scroll container (AppShell.module.css) is what this
    // bar's `position: sticky` sticks against. Tickets pagination sits
    // on the right, opposite Print/Export — task: "put the page bar
    // to the footer" — so it's always reachable without scrolling back
    // up past a short last page, and never disappears once the inner
    // table's own scroll region was removed (ReportsScreen.module.css's
    // `.tickets-table`).
    <div className={styles.bottomBar}>
        <ReportsActionsRow
            onPrint={() => onPrintOpenChange(true)}
            onExportXlsx={() => exportReportXlsx(reportSlipData)}
            onExportCsv={() => exportReportCsv(reportSlipData)}
        />
        {view === "tickets" && (
            <TicketsPaginationRow pageIndex={pageIndex} pageCount={pageCount} onPageIndexChange={onPageIndexChange} />
        )}
    </div>
);

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
    editingReportId,
    view,
    groupBy,
    filter,
    dateFrom,
    dateTo,
    visibleColumnKeys,
    savedReportActions,
    pageIndex,
    pageCount,
    onPageIndexChange,
}: ReportsScreenOverlaysProps) => {
    const editingDef = editingReportId
        ? savedReportActions.savedReports.find((def) => def.Id === editingReportId)
        : undefined;
    return (
    <>
        <ReportsBottomBar
            reportSlipData={reportSlipData}
            onPrintOpenChange={onPrintOpenChange}
            view={view}
            pageIndex={pageIndex}
            pageCount={pageCount}
            onPageIndexChange={onPageIndexChange}
        />
        <ReportPrintModal
            open={printOpen}
            onClose={() => onPrintOpenChange(false)}
            data={reportSlipData}
        />
        <ReportBuilderModal
            open={builderOpen}
            onClose={() => onBuilderOpenChange(false)}
            editingId={editingReportId}
            // Editing a saved view seeds the whole draft from *that*
            // definition, not the screen's currently-applied filters — the
            // two can differ (task's own scenario: pick a saved view from
            // the dropdown, edit a different one's pencil without recalling
            // it first). Falls back to the screen's live filters for a
            // fresh "Build report" (`editingReportId` is null then, so this
            // lookup is never used).
            initialView={editingDef?.View === "tickets" || editingDef?.View === "summary" ? editingDef.View : view}
            initialGroupBy={editingDef ? (editingDef.GroupBy as GroupKey) : groupBy}
            initialFilter={editingDef ? (editingDef.Filter as TicketRowFilter) : filter}
            initialDateFrom={editingDef ? (editingDef.DateFrom ?? "") : dateFrom}
            initialDateTo={editingDef ? (editingDef.DateTo ?? "") : dateTo}
            initialVisibleColumnKeys={
                editingDef ? (editingDef.Columns ? editingDef.Columns.split(",").filter(Boolean) : null) : visibleColumnKeys
            }
            initialName={editingDef?.Name ?? ""}
            onSaveReport={savedReportActions.handleSaveReportDraft}
            onUpdateReport={savedReportActions.handleUpdateReportDraft}
        />
    </>
    );
};
