import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";

export interface ReportsDateRangeRowProps {
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
    /** Reports' "include tickets from before the last reset" toggle — off by default (reportRows.ts's filterRowsBySeries). */
    includeBacked: boolean;
    onIncludeBackedChange: (includeBacked: boolean) => void;
}

// Split out of ReportsCardBody (over the line/complexity budget —
// docs/CodingStandards.md) — the date-range filter row that sits above
// the Tickets/Summary view content so it visibly scopes both. Also carries
// the "include backed/old-series tickets" toggle (task: fresh-series
// reset) — same row as the date range since both are display-only scoping
// controls over the same `rows`, not data-shaping ones like filter/group.
export const ReportsDateRangeRow = ({
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    includeBacked,
    onIncludeBackedChange,
}: ReportsDateRangeRowProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.dateRange}>
            <input
                type="date"
                className={styles.dateInput}
                value={dateFrom}
                onChange={(event) => onDateFromChange(event.target.value)}
                aria-label={t("reports.dateFromAriaLabel")}
            />
            <input
                type="date"
                className={styles.dateInput}
                value={dateTo}
                onChange={(event) => onDateToChange(event.target.value)}
                aria-label={t("reports.dateToAriaLabel")}
            />
            <label className={styles.ck}>
                <input
                    type="checkbox"
                    checked={includeBacked}
                    onChange={(event) => onIncludeBackedChange(event.target.checked)}
                />
                <span>{t("reports.includeBacked")}</span>
            </label>
        </div>
    );
};
