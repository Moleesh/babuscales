import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { SegmentedControl } from "@components/SegmentedControl";

import styles from "../_styles/ReportsScreen.module.css";
import { FILTER_OPTIONS } from "../reportRows";
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
export const TicketsView = ({ query, onQueryChange, filter, onFilterChange, columns, rows }: TicketsViewProps) => (
    <>
        <input
            className={styles.search}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search vehicle, party, ticket no, challan…"
            aria-label="Search tickets"
        />
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={onFilterChange} ariaLabel="Filter" />
        <DataTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.docId}
            emptyMessage="Nothing matches that filter"
        />
    </>
);
