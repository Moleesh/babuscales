import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { useSettings } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import { ReportsScreenCard } from "./_private/ReportsScreenCard";
import { ReportsScreenOverlays } from "./_private/ReportsScreenOverlays";
import { seedDemoTickets } from "./_private/seedDemoTickets";
import { useReportDocs } from "./_private/useReportDocs";
import { useReportsScreenController } from "./_private/useReportsScreenController";
import styles from "./_styles/ReportsScreen.module.css";

export interface ReportsScreenProps {
    /** Resumes (open ticket) or reopens (completed ticket, to reprint) into the shared Weighing deck and switches there. */
    onOpenTicket: (doc: DocRow) => void;
    /** Set by App.tsx when Dashboard's "waiting" KPI tile sends the operator
     * here wanting the waiting-on-second-weight filter pre-applied (a
     * bug fix — see useReportsScreenController's own comment). */
    reportsIntent?: { kind: "waiting"; nonce: number } | null;
}

// "There is no Tickets tab... a ticket list is a report that
// has not been grouped yet." One dataset (reportRows.ts), one toggle
// between the flat Tickets view and the grouped Summary view. Print is real
// (reportPrintRows.ts + ReportPrintModal, mirroring the per-ticket print
// engine). Export CSV/Excel are real too
// (engines/export — hand-rolled CSV and OOXML .xlsx writers),
// reusing reportSlipData's own Head/Rows so an export can never drift from
// what Print sends to the slip. Export PDF stays disabled: the OS print
// dialog's own "Save as PDF" already covers it via the Print button, so a
// distinct PDF export path wasn't built.
//
// Saved report definitions (db/reportDefs.ts) — name the current
// (view, group-by, filter) combination and recall it later with one click.
// Deliberately not the fuller "visual query builder over the dynamic
// schema" — reportDefs.ts's own comment has the full
// reasoning; the short version is schema-driven field
// rendering was never built, so there's no dynamic field data yet to build a query builder
// over, and the reference mock never built one either.
//
// Split into reportColumns/reportSlipData/reportExport (data shaping),
// useReportDocs/useSavedReportActions (load effects + handlers) and
// ReportsHeaderActions/TicketsView/SummaryView/ReportsActionsRow (JSX) —
// see _private/ for each.
export const ReportsScreen = ({ onOpenTicket, reportsIntent = null }: ReportsScreenProps) => {
    const db = useDataPort();
    const { t, lang } = useTranslation();
    const { settings } = useSettings();
    const amountDp = settings.Formats.AmountDp;
    const currentEpoch = settings.Numbering.CurrentEpoch;
    const { docs, loading } = useReportDocs(db);
    const s = useReportsScreenController({
        db,
        docs,
        onOpenTicket,
        amountDp,
        weightUnit: settings.Formats.WeightUnit,
        dateFmt: settings.Formats.DateFmt,
        timeFmt: settings.Formats.TimeFmt,
        currentEpoch,
        styles,
        t,
        lang,
        reportsIntent,
    });
    // Dev-only "Add sample tickets" control — undefined (so the button never
    // renders) outside a dev build. See seedDemoTickets.ts's own doc comment.
    const onSeedDemoTickets = import.meta.env.DEV ? () => void seedDemoTickets(db) : undefined;

    return (
        <div className={styles.screen}>
            <ReportsScreenCard s={s} loading={loading} onSeedDemoTickets={onSeedDemoTickets} />
            <ReportsScreenOverlays
                reportSlipData={s.reportSlipData}
                printOpen={s.printOpen}
                onPrintOpenChange={s.setPrintOpen}
                builderOpen={s.builderOpen}
                onBuilderOpenChange={s.setBuilderOpen}
                view={s.view}
                onViewChange={s.setView}
                groupBy={s.groupBy}
                onGroupByChange={s.setGroupBy}
                filter={s.filter}
                onFilterChange={s.setFilter}
                dateFrom={s.dateFrom}
                onDateFromChange={s.setDateFrom}
                dateTo={s.dateTo}
                onDateToChange={s.setDateTo}
                visibleColumnKeys={s.visibleColumnKeys}
                onVisibleColumnKeysChange={s.setVisibleColumnKeys}
                savedReportActions={s.savedReportActions}
                pageIndex={s.pageIndex}
                pageCount={s.pageCount}
                onPageIndexChange={s.setPageIndex}
            />
        </div>
    );
};
