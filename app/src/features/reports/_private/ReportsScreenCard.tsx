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
            title={<span className="lbl">{t("reports.title")}</span>}
            headerRight={
                <ReportsHeaderActions
                    view={s.view}
                    onViewChange={s.setView}
                    waitingCount={s.waitingCount}
                    onShowWaiting={s.showWaiting}
                    onOpenBuilder={() => s.setBuilderOpen(true)}
                />
            }
        >
            <ReportsCardBody
                loading={loading}
                savedReportActions={s.savedReportActions}
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
                groupBy={s.groupBy}
                onGroupByChange={s.setGroupBy}
                ticketColumns={s.ticketColumns}
                visibleRows={s.visibleRows}
                summaryColumns={s.summaryColumns}
                summaryRows={s.summaryRows}
            />
        </Card>
    );
};
