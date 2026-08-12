import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { SegmentedControl } from "@components/SegmentedControl";
import { useTranslation } from "@i18n/useTranslation";

import { TicketsSortRow } from "./TicketsSortRow";
import styles from "../_styles/ReportsScreen.module.css";
import { filterOptions } from "../reportRows";
import type { SortDir, TicketRow, TicketRowFilter, TicketSortKey } from "../reportRows";

export interface TicketsViewProps {
    query: string;
    onQueryChange: (query: string) => void;
    filter: TicketRowFilter;
    onFilterChange: (filter: TicketRowFilter) => void;
    sortKey: TicketSortKey;
    onSortKeyChange: (sortKey: TicketSortKey) => void;
    sortDir: SortDir;
    onSortDirChange: (sortDir: SortDir) => void;
    columns: DataTableColumn<TicketRow>[];
    rows: TicketRow[];
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Tickets-view search + filter + sort + table,
// unchanged from the inline version it replaces except for the added
// TicketsSortRow (task: Reports rework, item 2 — sort-order control).
export const TicketsView = ({
    query,
    onQueryChange,
    filter,
    onFilterChange,
    sortKey,
    onSortKeyChange,
    sortDir,
    onSortDirChange,
    columns,
    rows,
}: TicketsViewProps) => {
    const { t } = useTranslation();
    return (
        <>
            <input
                className={styles.search}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t("reports.searchPlaceholder")}
                aria-label={t("reports.searchAriaLabel")}
            />
            <SegmentedControl
                options={filterOptions(t)}
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
            <DataTable
                columns={columns}
                rows={rows}
                getRowId={(row) => row.docId}
                emptyMessage={t("reports.ticketsEmpty")}
            />
        </>
    );
};
