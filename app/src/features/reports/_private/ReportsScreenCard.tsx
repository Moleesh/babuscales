import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { ReportsCardBody } from "./ReportsCardBody";
import { ReportsHeaderActions } from "./ReportsHeaderActions";
import type { UseReportsScreenController } from "./useReportsScreenController";
import styles from "../_styles/ReportsScreen.module.css";

export interface ReportsScreenCardProps {
    s: UseReportsScreenController;
    /** True until the ticket docs behind every view/table below have loaded once — see ReportsScreen's own useReportDocs() call. */
    loading: boolean;
}

// Task: "move it next to the Report label not atht the cirrent palce" — the
// record-count span moved out of ReportsHeaderActions (the view-switcher/
// waiting-chip/build-report cluster) to sit right beside the "REPORTS" title
// text itself instead.
const ReportsCardTitle = ({ scopedCount, matchingCount }: { scopedCount: number; matchingCount: number | null }) => {
    const { t } = useTranslation();
    // Only worth a second figure once a quick search/status chip actually
    // narrows the scoped set — otherwise "21 · 21 matching" is just noise.
    const showMatching = matchingCount !== null && matchingCount !== scopedCount;
    return (
        <span className={styles.titleRow}>
            <span className="lbl">{t("reports.title")}</span>
            {/* Task: "follow this for count" — a round pill badge (the app's
                existing `.chip` look, base.css) instead of a plain inline
                figure, matching the reference screenshot's rounded "12". */}
            <span className="chip">{scopedCount}</span>
            {showMatching && (
                <span className="chip">
                    {matchingCount} {t("reports.counts.matchingSuffix")}
                </span>
            )}
        </span>
    );
};

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Card itself (header actions + body),
// taking the whole controller return value the same way ReportsCardBody's
// props already mirror it, just one level up.
export const ReportsScreenCard = ({ s, loading }: ReportsScreenCardProps) => {
    return (
        <Card
            sticky
            title={
                <ReportsCardTitle
                    scopedCount={s.scopedCount}
                    matchingCount={s.view === "tickets" ? s.visibleRows.length : null}
                />
            }
            headerRight={
                <ReportsHeaderActions
                    view={s.view}
                    onViewChange={s.setView}
                    waitingCount={s.waitingCount}
                    onShowWaiting={s.showWaiting}
                    // `setEditingReportId(null)` — a fresh "Build report"
                    // open must not inherit whatever saved view was last
                    // edited via SavedReportsRow's pencil (openReportForEdit),
                    // or Save here would silently overwrite that view instead
                    // of adding a new one.
                    onOpenBuilder={() => {
                        s.setEditingReportId(null);
                        s.setBuilderOpen(true);
                    }}
                />
            }
        >
            <ReportsCardBody
                loading={loading}
                reportApplied={s.reportApplied}
                savedReportActions={s.savedReportActions}
                onEditSavedReport={s.openReportForEdit}
                view={s.view}
                query={s.query}
                onQueryChange={s.setQuery}
                filter={s.filter}
                onFilterChange={s.setFilter}
                sortKey={s.sortKey}
                onSortKeyChange={s.setSortKey}
                sortDir={s.sortDir}
                onSortDirChange={s.setSortDir}
                dateFrom={s.dateFrom}
                onDateFromChange={s.setDateFrom}
                dateTo={s.dateTo}
                onDateToChange={s.setDateTo}
                seriesEpoch={s.seriesEpoch}
                onSeriesEpochChange={s.setSeriesEpoch}
                seriesEpochOptions={s.seriesEpochOptions}
                showSeriesEpoch={s.showSeriesEpoch}
                dateFmt={s.dateFmt}
                filterCounts={s.filterCounts}
                groupBy={s.groupBy}
                onGroupByChange={s.setGroupBy}
                ticketColumns={s.ticketColumns}
                pagedRows={s.pagedRows}
                summaryColumns={s.summaryColumns}
                summaryRows={s.summaryRows}
            />
        </Card>
    );
};
