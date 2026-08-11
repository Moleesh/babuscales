import { useState } from "react";

import { Card } from "@components/Card";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { useSettings } from "@features/settings";

import { ReportPrintModal } from "./_private/ReportPrintModal";
import { ReportsCardBody } from "./_private/ReportsCardBody";
import { ReportsHeaderActions } from "./_private/ReportsHeaderActions";
import { useReportDocs } from "./_private/useReportDocs";
import { useReportsScreenData } from "./_private/useReportsScreenData";
import { useSavedReportActions } from "./_private/useSavedReportActions";
import type { GroupKey, ReportView, TicketRowFilter } from "./reportRows";
import styles from "./ReportsScreen.module.css";

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
    const { settings } = useSettings();
    const amountDp = settings.Formats.AmountDp;
    const docs = useReportDocs(db);
    const [view, setView] = useState<ReportView>("tickets");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<TicketRowFilter>("all");
    const [groupBy, setGroupBy] = useState<GroupKey>("material");
    const [printOpen, setPrintOpen] = useState(false);
    const savedReportActions = useSavedReportActions({ db, view, groupBy, filter, setView, setGroupBy, setFilter });
    const { waitingCount, visibleRows, summaryRows, reportSlipData, ticketColumns, summaryColumns } =
        useReportsScreenData({ docs, view, query, filter, groupBy, onOpenTicket, amountDp, styles });

    const showWaiting = (): void => {
        setView("tickets");
        setFilter("half");
    };

    return (
        <div className={styles.screen}>
            <Card
                title={<span className="lbl">Reports</span>}
                headerRight={
                    <ReportsHeaderActions
                        view={view}
                        onViewChange={setView}
                        waitingCount={waitingCount}
                        onShowWaiting={showWaiting}
                    />
                }
            >
                <ReportsCardBody
                    savedReportActions={savedReportActions}
                    view={view}
                    query={query}
                    onQueryChange={setQuery}
                    filter={filter}
                    onFilterChange={setFilter}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    ticketColumns={ticketColumns}
                    visibleRows={visibleRows}
                    summaryColumns={summaryColumns}
                    summaryRows={summaryRows}
                    reportSlipData={reportSlipData}
                    onPrint={() => setPrintOpen(true)}
                />
            </Card>
            <ReportPrintModal open={printOpen} onClose={() => setPrintOpen(false)} data={reportSlipData} />
        </div>
    );
};
