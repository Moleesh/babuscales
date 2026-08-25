import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { SegmentedControl } from "@components/SegmentedControl";
import { Spinner } from "@components/Spinner";
import { useTranslation } from "@i18n/useTranslation";

import { TicketsSortRow } from "./TicketsSortRow";
import styles from "../_styles/ReportsScreen.module.css";
import { filterOptions } from "../reportRows";
import type { SortDir, TicketRow, TicketRowFilter, TicketRowFilterCounts, TicketSortKey } from "../reportRows";

export interface TicketsFilterRowProps {
    query: string;
    onQueryChange: (query: string) => void;
    filter: TicketRowFilter;
    onFilterChange: (filter: TicketRowFilter) => void;
    sortKey: TicketSortKey;
    onSortKeyChange: (sortKey: TicketSortKey) => void;
    sortDir: SortDir;
    onSortDirChange: (sortDir: SortDir) => void;
    /** Follow-up: "you can add the sub counts here too All / Waiting for
     * the second weight / Both weights" — per-status counts, appended onto
     * each `SegmentedControl` option's own label below. */
    filterCounts: TicketRowFilterCounts;
}

// Split out of TicketsView so ReportsCardBody can stack it with
// ReportsDateRangeRow inside one sticky wrapper (`.sticky-filters`) — the
// search/filter/sort controls scroll with the header instead of the table
// underneath them, same request as the Settings tab bar's own sticky fix.
export const TicketsFilterRow = ({
    query,
    onQueryChange,
    filter,
    onFilterChange,
    sortKey,
    onSortKeyChange,
    sortDir,
    onSortDirChange,
    filterCounts,
}: TicketsFilterRowProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.filterRow}>
            <input
                className={styles.search}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t("reports.searchPlaceholder")}
                aria-label={t("reports.searchAriaLabel")}
                autoComplete="off"
            />
            <SegmentedControl
                options={filterOptions(t, filterCounts)}
                value={filter}
                onChange={onFilterChange}
                ariaLabel={t("reports.filterAriaLabel")}
            />
            <TicketsSortRow
                sortKey={sortKey}
                onSortKeyChange={onSortKeyChange}
                sortDir={sortDir}
                onSortDirChange={onSortDirChange}
            />
        </div>
    );
};

export interface TicketsPaginationRowProps {
    pageIndex: number;
    pageCount: number;
    onPageIndexChange: (pageIndex: number) => void;
}

// Task: "REPORT NEED A REAMP IF I HAVE LIKE MORE TAHN 100 IT WILL KILL THE
// FLOW" -> "Can we do pagenation instead ?" — Prev/Next over
// reportRows.ts's `paginateTicketRows`/`ticketPageCount`. `t()` doesn't
// support interpolation (i18n/strings.ts), so "Page 3 of 12" is composed
// from two label fragments around the plain numbers, same pattern as
// FieldSchemaCard's `{count} {t("...fieldsSuffix")}`.
export const TicketsPaginationRow = ({ pageIndex, pageCount, onPageIndexChange }: TicketsPaginationRowProps) => {
    const { t } = useTranslation();
    if (pageCount <= 1) return null;
    return (
        <div className={styles.pageRow} aria-label={t("reports.page.ariaLabel")}>
            <button
                type="button"
                className={styles.pageBtn}
                disabled={pageIndex <= 0}
                onClick={() => onPageIndexChange(pageIndex - 1)}
            >
                {t("reports.page.prev")}
            </button>
            <span className={styles.pageLabel}>
                {t("reports.page.pagePrefix")} {pageIndex + 1} {t("reports.page.ofPrefix")} {pageCount}
            </span>
            <button
                type="button"
                className={styles.pageBtn}
                disabled={pageIndex >= pageCount - 1}
                onClick={() => onPageIndexChange(pageIndex + 1)}
            >
                {t("reports.page.next")}
            </button>
        </div>
    );
};

export interface TicketsViewProps {
    columns: DataTableColumn<TicketRow>[];
    rows: TicketRow[];
    loading: boolean;
    /** Reports rework, item 3 — `false` until the operator explicitly asks
     * for a report (see useReportsScreenController.ts's own comment);
     * swaps the empty message to a "pick a saved view / build a report"
     * prompt instead of "nothing matches that filter". */
    reportApplied: boolean;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Tickets-view table. The search/filter/sort
// row moved out to TicketsFilterRow above (rendered by ReportsCardBody,
// stacked with ReportsDateRangeRow inside its sticky wrapper); pagination
// (TicketsPaginationRow, above) moved out to the sticky bottom bar
// (ReportsScreenOverlays.tsx) alongside Print/Export, so this is now just
// the table — `rows` is already the current page's slice
// (useReportsScreenData.ts's `pagedRows`). `.ticketsTable` unsets
// DataTable's own inner scroll bound (DataTable.module.css's
// `--datatable-max-height`) — task: "double scroll bar" — a paginated
// 50-row page rarely fills that inner scroll region anyway, so `.main` is
// now the only scroll container here.
export const TicketsView = ({ columns, rows, loading, reportApplied }: TicketsViewProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.ticketsTable}>
            <DataTable
                columns={columns}
                rows={rows}
                getRowId={(row) => row.docId}
                emptyMessage={
                    loading ? (
                        <span className={styles.loadingRow}>
                            <Spinner size="sm" label={t("reports.loading")} /> {t("reports.loading")}
                        </span>
                    ) : !reportApplied ? (
                        t("reports.selectReportEmpty")
                    ) : (
                        t("reports.ticketsEmpty")
                    )
                }
            />
        </div>
    );
};
