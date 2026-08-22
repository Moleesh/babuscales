import { useTranslation } from "@i18n/useTranslation";

import { filterOptions, ticketColumnOptions, viewOptions } from "../reportRows";
import type { ReportView, TicketRowFilter } from "../reportRows";
import styles from "./_styles/ReportBuilderModal.module.css";

export interface ReportBuilderReviewProps {
    view: ReportView;
    filter: TicketRowFilter;
    dateFrom: string;
    dateTo: string;
    visibleColumnKeys: string[] | null;
}

/** Split out of ReportBuilderModal's step 3 (over the line/complexity
 * budget — docs/CodingStandards.md) — a plain-language recap of every
 * earlier step's picks, shown right before the operator saves/finishes so
 * nothing is a surprise. Read-only: change a pick by going Back, not here. */
export const ReportBuilderReview = ({
    view,
    filter,
    dateFrom,
    dateTo,
    visibleColumnKeys,
}: ReportBuilderReviewProps) => {
    const { t } = useTranslation();
    const viewLabel = viewOptions(t).find((option) => option.value === view)?.label ?? view;
    const filterLabel = filterOptions(t).find((option) => option.value === filter)?.label ?? filter;
    const rangeLabel =
        dateFrom || dateTo
            ? `${dateFrom || "…"} → ${dateTo || "…"}`
            : t("reports.builder.reviewAllDates");
    const columnsLabel = visibleColumnKeys
        ? String(visibleColumnKeys.length)
        : String(ticketColumnOptions(t).length);

    return (
        <dl className={styles.review}>
            <dt>{t("reports.viewAriaLabel")}</dt>
            <dd>{viewLabel}</dd>
            <dt>{t("reports.builder.reviewDateRange")}</dt>
            <dd>{rangeLabel}</dd>
            <dt>{t("reports.filterAriaLabel")}</dt>
            <dd>{filterLabel}</dd>
            <dt>{t("reports.builder.columnsLabel")}</dt>
            <dd>{columnsLabel}</dd>
        </dl>
    );
};
