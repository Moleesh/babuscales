import { DatePicker } from "@components/DatePicker";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";
import type { SeriesEpochOption } from "../reportRows";

/** `Select` needs a string-valued option list — `"current"` or the epoch
 * itself, stringified (numbers round-trip cleanly through `Number(...)`,
 * `SeriesEpoch` is always a small non-negative integer). */
const CURRENT_EPOCH_VALUE = "current";
/** Task: "its 19 on top and 5 when returning some calution mistake" — the
 * waiting chip's own badge (waitingCount, useReportsScreenData.ts) counts
 * every open ticket across every numbering series ever used, but there was
 * no way to actually *view* that same scope — only "Current" or one prior
 * series at a time (`filterRowsBySeries`'s own "never a merge across
 * series" rule, reportRows.ts). This sentinel opts a recalled/clicked
 * report out of the series scope entirely instead of merging series data
 * for a search/ticket-number view (where a genuine merge could collide two
 * different series' numbers) — it's a deliberate, explicit "show
 * everything" choice, not the default. */
const ALL_EPOCH_VALUE = "all";

/** `seriesEpoch` -> the Select's string value — pulled out of the component
 * body purely to keep it under the file's own line budget
 * (docs/CodingStandards.md) now that a third (`"all"`) state joined the
 * two this used to inline. */
const seriesEpochValue = (seriesEpoch: number | "current" | "all" | undefined): string => {
    if (seriesEpoch === "all") return ALL_EPOCH_VALUE;
    if (seriesEpoch === "current" || seriesEpoch === undefined) return CURRENT_EPOCH_VALUE;
    return String(seriesEpoch);
};

const seriesEpochOnChange = (value: string): number | "current" | "all" => {
    if (value === ALL_EPOCH_VALUE) return "all";
    if (value === CURRENT_EPOCH_VALUE) return "current";
    return Number(value);
};

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
    seriesEpoch?: number | "current" | "all" | undefined;
    onSeriesEpochChange?: ((epoch: number | "current" | "all") => void) | undefined;
    seriesEpochOptions?: SeriesEpochOption[] | undefined;
    /** Settings' `Formats.DateFmt` — passed straight through to `DatePicker`
     * so the two trigger buttons read a date in the same pattern as every
     * other date on this screen (reportColumns.tsx's own `formatDateInFmt`
     * calls). Typed `string`, matching how it already flows through
     * `useReportsScreenController`. Optional, same as `DatePicker`'s own
     * `dateFmt` — falls back to its default when the caller (e.g. the
     * report-builder wizard) doesn't have one handy. */
    dateFmt?: string | undefined;
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
                    {...(dateFmt !== undefined ? { dateFmt } : {})}
                    aria-label={t("reports.dateFromAriaLabel")}
                />
            </div>
            <div className={styles.rangeField}>
                <span className={styles.rangeFieldLabel}>{t("reports.dateToAriaLabel")}</span>
                <DatePicker
                    value={dateTo}
                    onChange={onDateToChange}
                    {...(dateFmt !== undefined ? { dateFmt } : {})}
                    aria-label={t("reports.dateToAriaLabel")}
                />
            </div>
            {onSeriesEpochChange && seriesEpochOptions ? (
                // Task: "make this dropdown little bigger" — "Before reset …"
                // labels (reportRows.ts's listSeriesEpochOptions) run longer
                // than Select's own 160px floor (Select.module.css), so they
                // were truncating with an ellipsis; `.series-field` widens
                // just this one instance's track, not every Select in the app.
                <div className={`${styles.rangeField} ${styles.seriesField}`}>
                    <span className={styles.rangeFieldLabel}>{t("reports.series.label")}</span>
                    <Select
                        id="reportsSeriesEpoch"
                        value={seriesEpochValue(seriesEpoch)}
                        options={[
                            { value: ALL_EPOCH_VALUE, label: t("reports.series.all") },
                            ...seriesEpochOptions.map((option, index) => ({
                                // `listSeriesEpochOptions` always puts "Current" first
                                // (reportRows.ts) — that one entry gets the sentinel
                                // value so it matches `seriesEpoch === "current"`
                                // regardless of what `Numbering.CurrentEpoch` actually is.
                                value: index === 0 ? CURRENT_EPOCH_VALUE : String(option.epoch),
                                label: option.label,
                            })),
                        ]}
                        onChange={(value) => onSeriesEpochChange(seriesEpochOnChange(value))}
                    />
                </div>
            ) : null}
        </div>
    );
};
