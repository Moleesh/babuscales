import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { SegmentedControl } from "@components/SegmentedControl";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";
import { filterOptions } from "../reportRows";
import type { TicketRow, TicketRowFilter } from "../reportRows";

export interface TicketsViewProps {
    query: string;
    onQueryChange: (query: string) => void;
    filter: TicketRowFilter;
    onFilterChange: (filter: TicketRowFilter) => void;
    columns: DataTableColumn<TicketRow>[];
    rows: TicketRow[];
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Tickets-view search + filter + table,
// unchanged from the inline version it replaces.
export const TicketsView = ({
    query,
    onQueryChange,
    filter,
    onFilterChange,
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
            <DataTable
                columns={columns}
                rows={rows}
                getRowId={(row) => row.docId}
                emptyMessage={t("reports.ticketsEmpty")}
            />
        </>
    );
};
