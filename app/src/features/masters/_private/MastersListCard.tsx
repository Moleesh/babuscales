import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Spinner } from "@components/Spinner";
import type { MasterRow } from "@db/types";

import styles from "../_styles/MastersScreen.module.css";

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
    /** Keyset-paginated "Load more" — undefined/false hides the button entirely. */
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
    t: (key: string) => string;
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the search input + results DataTable card.
// Now uses the t() function for translatable strings.
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
    hasMore,
    loadingMore,
    onLoadMore,
    t,
}: MastersListCardProps) => (
    // `fill` — task: "like in report can you make the table only scrolling
    // nothing else" — lets this card's DataTable flex to fill the room left
    // by MastersScreen's SegmentedControl and MastersFormCard (the two
    // siblings that must stay put) instead of pushing `.main` itself into a
    // second, page-level scroll.
    <Card fill title={<span className="lbl">{title}</span>} headerRight={<span className="chip num">{count}</span>}>
        <div className={`${styles.body} ${styles["body-fill-inner"]}`}>
            <input
                className={styles.search}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                autoComplete="off"
            />
            <DataTable
                columns={columns}
                rows={rows}
                getRowId={(row) => row.MasterId}
                onRowClick={onRowClick}
                emptyMessage={
                    loading ? (
                        <span className={styles.loadingRow}>
                            <Spinner size="sm" label={t("masters.loading")} /> {t("masters.loading")}
                        </span>
                    ) : (
                        `${t("masters.emptyPrefix")} ${title.toLowerCase()} ${t("masters.emptySuffix")}`
                    )
                }
            />
            {hasMore && onLoadMore && (
                <Button onClick={onLoadMore} disabled={loadingMore}>
                    {loadingMore ? (
                        <span className={styles.loadingRow}>
                            <Spinner size="sm" label={t("masters.loading")} /> {t("masters.loading")}
                        </span>
                    ) : (
                        t("masters.loadMore")
                    )}
                </Button>
            )}
        </div>
    </Card>
);
