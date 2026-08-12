import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";
import { sortOptions } from "../reportRows";
import type { SortDir, TicketSortKey } from "../reportRows";

export interface TicketsSortRowProps {
    sortKey: TicketSortKey;
    onSortKeyChange: (sortKey: TicketSortKey) => void;
    sortDir: SortDir;
    onSortDirChange: (sortDir: SortDir) => void;
}

// Split out of TicketsView (over the line/complexity budget —
// docs/CodingStandards.md) — task: Reports rework, item 2. A plain
// "Sort by" select plus an asc/desc toggle button, the same shape as
// SummaryView's own group-by select — deliberately not clickable column
// headers, which would mean threading sort state into the shared
// DataTable component every other list (Masters) also renders through.
export const TicketsSortRow = ({
    sortKey,
    onSortKeyChange,
    sortDir,
    onSortDirChange,
}: TicketsSortRowProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.sortRow}>
            <label className={styles.sortLabel} htmlFor="rSort">
                {t("reports.sortByLabel")}
            </label>
            <select
                id="rSort"
                value={sortKey}
                onChange={(event) => onSortKeyChange(event.target.value as TicketSortKey)}
            >
                {sortOptions(t).map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <button
                type="button"
                className={styles.sortDirBtn}
                aria-label={t("reports.sortDirAriaLabel")}
                onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}
            >
                {sortDir === "asc" ? "↑" : "↓"}
            </button>
        </div>
    );
};
