import { DatePicker } from "@components/DatePicker";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";

export interface ReportsDateRangeRowProps {
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
    /** Reports' "include tickets from before the last reset" toggle — off by default (reportRows.ts's filterRowsBySeries). Omitted by the report-builder wizard's step 1 (ReportBuilderStep1.tsx), which only scopes the date range itself, not this screen-level series toggle — the checkbox is hidden whenever this is left out. */
    includeBacked?: boolean;
    onIncludeBackedChange?: (includeBacked: boolean) => void;
    /** Settings' `Formats.DateFmt` — passed straight through to `DatePicker`
     * so the two trigger buttons read a date in the same pattern as every
     * other date on this screen (reportColumns.tsx's own `formatDateInFmt`
     * calls). Typed `string`, matching how it already flows through
     * `useReportsScreenController`. Optional, same as `DatePicker`'s own
     * `dateFmt` — falls back to its default when the caller (e.g. the
     * report-builder wizard) doesn't have one handy. */
    dateFmt?: string;
}

// Split out of ReportsCardBody (over the line/complexity budget —
// docs/CodingStandards.md) — the date-range filter row that sits above
// the Tickets/Summary view content so it visibly scopes both. Also carries
// the "include backed/old-series tickets" toggle (a fresh-series
// reset) — same row as the date range since both are display-only scoping
// controls over the same `rows`, not data-shaping ones like filter/group.
export const ReportsDateRangeRow = ({
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    includeBacked,
    onIncludeBackedChange,
    dateFmt,
}: ReportsDateRangeRowProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.dateRange}>
            {/* Native `<input type="date">` swapped for the themed DatePicker
                — the OS-drawn native calendar can't be styled and the
                custom cursor follower can't reach it — same "YYYY-MM-DD"
                value contract, so nothing downstream of onDateFromChange/
                onDateToChange had to change. */}
            <DatePicker
                value={dateFrom}
                onChange={onDateFromChange}
                dateFmt={dateFmt}
                aria-label={t("reports.dateFromAriaLabel")}
            />
            <DatePicker
                value={dateTo}
                onChange={onDateToChange}
                dateFmt={dateFmt}
                aria-label={t("reports.dateToAriaLabel")}
            />
            {onIncludeBackedChange ? (
                <label className={styles.ck}>
                    <input
                        type="checkbox"
                        checked={includeBacked ?? false}
                        onChange={(event) => onIncludeBackedChange(event.target.checked)}
                    />
                    <span>{t("reports.includeBacked")}</span>
                </label>
            ) : null}
        </div>
    );
};
