import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";

export interface ReportsDateRangeRowProps {
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
}

// Split out of ReportsCardBody (over the line/complexity budget —
// docs/CodingStandards.md) — the date-range filter row that sits above
// the Tickets/Summary view content so it visibly scopes both.
export const ReportsDateRangeRow = ({
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
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
        </div>
    );
};
