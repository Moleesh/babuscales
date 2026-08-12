import { Card } from "@components/Card";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { useSettings } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import { ReportPrintModal } from "./_private/ReportPrintModal";
import { ReportsCardBody } from "./_private/ReportsCardBody";
import { ReportsHeaderActions } from "./_private/ReportsHeaderActions";
import { useReportDocs } from "./_private/useReportDocs";
import { useReportsScreenController } from "./_private/useReportsScreenController";
import styles from "./_styles/ReportsScreen.module.css";

export interface ReportsScreenProps {
    /** Resumes (open ticket) or reopens (completed ticket, to reprint) into the shared Weighing deck and switches there. */
    onOpenTicket: (doc: DocRow) => void;
}

// PLAN §13.1 — "there is no Tickets tab... a ticket list is a report that
// has not been grouped yet." One dataset (reportRows.ts), one toggle
// between the flat Tickets view and the grouped Summary view. Print is real
// (reportPrintRows.ts + ReportPrintModal, mirroring the per-ticket print
// engine — Phase-2 item 19/23). Export CSV/Excel are real too
// (engines/export — hand-rolled CSV and OOXML .xlsx writers, task #53),
// reusing reportSlipData's own Head/Rows so an export can never drift from
// what Print sends to the slip. Export PDF stays disabled: the OS print
// dialog's own "Save as PDF" already covers it via the Print button, so a
// distinct PDF export path wasn't built.
//
// Saved report definitions (task #54, db/reportDefs.ts) — name the current
// (view, group-by, filter) combination and recall it later with one click.
// Deliberately not the fuller "visual query builder over the dynamic
// schema" PLAN §18 describes — reportDefs.ts's own comment has the full
// reasoning; the short version is task #50 never built schema-driven field
// rendering, so there's no dynamic field data yet to build a query builder
// over, and the reference mock never built one either.
//
// Split into reportColumns/reportSlipData/reportExport (data shaping),
// useReportDocs/useSavedReportActions (load effects + handlers) and
// ReportsHeaderActions/TicketsView/SummaryView/ReportsActionsRow (JSX) —
// see _private/ for each.
export const ReportsScreen = ({ onOpenTicket }: ReportsScreenProps) => {
    const db = useDataPort();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const amountDp = settings.Formats.AmountDp;
    const docs = useReportDocs(db);
    const s = useReportsScreenController({ db, docs, onOpenTicket, amountDp, styles, t });

    return (
        <div className={styles.screen}>
            <Card
                title={<span className="lbl">{t("reports.title")}</span>}
                headerRight={
                    <ReportsHeaderActions
                        view={s.view}
                        onViewChange={s.setView}
                        waitingCount={s.waitingCount}
                        onShowWaiting={s.showWaiting}
                    />
                }
            >
                <ReportsCardBody
                    savedReportActions={s.savedReportActions}
                    view={s.view}
                    query={s.query}
                    onQueryChange={s.setQuery}
                    filter={s.filter}
                    onFilterChange={s.setFilter}
                    dateFrom={s.dateFrom}
                    onDateFromChange={s.setDateFrom}
                    dateTo={s.dateTo}
                    onDateToChange={s.setDateTo}
                    groupBy={s.groupBy}
                    onGroupByChange={s.setGroupBy}
                    ticketColumns={s.ticketColumns}
                    visibleRows={s.visibleRows}
                    summaryColumns={s.summaryColumns}
                    summaryRows={s.summaryRows}
                    reportSlipData={s.reportSlipData}
                    onPrint={() => s.setPrintOpen(true)}
                />
            </Card>
            <ReportPrintModal
                open={s.printOpen}
                onClose={() => s.setPrintOpen(false)}
                data={s.reportSlipData}
            />
        </div>
    );
};
