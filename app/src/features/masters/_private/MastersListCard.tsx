import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import type { MasterRow } from "@db/types";

import styles from "../MastersScreen.module.css";

export interface MastersListCardProps {
    title: string;
    count: number;
    query: string;
    onQueryChange: (next: string) => void;
    searchPlaceholder: string;
    columns: DataTableColumn<MasterRow>[];
    rows: MasterRow[];
    loading: boolean;
    onRowClick: (row: MasterRow) => void;
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the search input + results DataTable card,
// unchanged from the inline version it replaces.
export const MastersListCard = ({
    title,
    count,
    query,
    onQueryChange,
    searchPlaceholder,
    columns,
    rows,
    loading,
    onRowClick,
}: MastersListCardProps) => (
    <Card title={<span className="lbl">{title}</span>} headerRight={<span className="chip num">{count}</span>}>
        <div className={styles.body}>
            <input
                className={styles.search}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
            />
            <DataTable
                columns={columns}
                rows={rows}
                getRowId={(row) => row.MasterId}
                onRowClick={onRowClick}
                emptyMessage={loading ? "Loading…" : `No ${title.toLowerCase()} yet`}
            />
        </div>
    </Card>
);
