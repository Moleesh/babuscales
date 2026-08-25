import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { ReportsCardBody } from "./ReportsCardBody";
import { ReportsHeaderActions } from "./ReportsHeaderActions";
import type { UseReportsScreenController } from "./useReportsScreenController";

export interface ReportsScreenCardProps {
    s: UseReportsScreenController;
    /** True until the ticket docs behind every view/table below have loaded once — see ReportsScreen's own useReportDocs() call. */
    loading: boolean;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Card itself (header actions + body),
// taking the whole controller return value the same way ReportsCardBody's
// props already mirror it, just one level up.
export const ReportsScreenCard = ({ s, loading }: ReportsScreenCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            sticky
            title={<span className="lbl">{t("reports.title")}</span>}
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
                dateFmt={s.dateFmt}
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
