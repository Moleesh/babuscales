import { DatePicker } from "@components/DatePicker";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";
import type { SeriesEpochOption } from "../reportRows";

/** `Select` needs a string-valued option list — `"current"` or the epoch
 * itself, stringified (numbers round-trip cleanly through `Number(...)`,
 * `SeriesEpoch` is always a small non-negative integer). */
const CURRENT_EPOCH_VALUE = "current";

export interface ReportsDateRangeRowProps {
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
    /** Reports' "include tickets from before the last reset" dropdown —
     * "Current" plus one entry per prior numbering series a ticket actually
     * exists in (reportRows.ts's `listSeriesEpochOptions`). Picking a prior
     * series scopes the whole screen to *only* that series, never a merge
     * across series. Omitted by the report-builder modal (ReportBuilderModal.tsx),
     * which only scopes the date range itself, not this screen-level series
     * filter — the dropdown is hidden whenever these are left out. */
    seriesEpoch?: number | "current";
    onSeriesEpochChange?: (epoch: number | "current") => void;
    seriesEpochOptions?: SeriesEpochOption[];
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
    seriesEpoch,
    onSeriesEpochChange,
    seriesEpochOptions,
    dateFmt,
}: ReportsDateRangeRowProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.dateRange}>
            {/* Native `<input type="date">` swapped for the themed DatePicker
                — the OS-drawn native calendar can't be styled and the
                custom cursor follower can't reach it — same "YYYY-MM-DD"
                value contract, so nothing downstream of onDateFromChange/
                onDateToChange had to change. Each control now carries a
                small visible caption above it (task: "utilize the space in
                the second row of the report, give some context to the
                dropdowns") — this row previously read as three unlabeled
                controls in a line; the caption text reuses each control's
                own existing aria-label/i18n key rather than adding new ones. */}
            <div className={styles.rangeField}>
                <span className={styles.rangeFieldLabel}>{t("reports.dateFromAriaLabel")}</span>
                <DatePicker
                    value={dateFrom}
                    onChange={onDateFromChange}
                    dateFmt={dateFmt}
                    aria-label={t("reports.dateFromAriaLabel")}
                />
            </div>
            <div className={styles.rangeField}>
                <span className={styles.rangeFieldLabel}>{t("reports.dateToAriaLabel")}</span>
                <DatePicker
                    value={dateTo}
                    onChange={onDateToChange}
                    dateFmt={dateFmt}
                    aria-label={t("reports.dateToAriaLabel")}
                />
            </div>
            {onSeriesEpochChange && seriesEpochOptions ? (
                <div className={styles.rangeField}>
                    <span className={styles.rangeFieldLabel}>{t("reports.series.label")}</span>
                    <Select
                        id="reportsSeriesEpoch"
                        value={
                            seriesEpoch === "current" || seriesEpoch === undefined
                                ? CURRENT_EPOCH_VALUE
                                : String(seriesEpoch)
                        }
                        options={seriesEpochOptions.map((option, index) => ({
                            // `listSeriesEpochOptions` always puts "Current" first
                            // (reportRows.ts) — that one entry gets the sentinel
                            // value so it matches `seriesEpoch === "current"`
                            // regardless of what `Numbering.CurrentEpoch` actually is.
                            value: index === 0 ? CURRENT_EPOCH_VALUE : String(option.epoch),
                            label: option.label,
                        }))}
                        onChange={(value) =>
                            onSeriesEpochChange(value === CURRENT_EPOCH_VALUE ? "current" : Number(value))
                        }
                    />
                </div>
            ) : null}
        </div>
    );
};
