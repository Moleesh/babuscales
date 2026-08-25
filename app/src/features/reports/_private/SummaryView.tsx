import { useEffect, useRef } from "react";

import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import { Spinner } from "@components/Spinner";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";
import { groupOptions } from "../reportRows";
import type { GroupKey, SummaryRow } from "../reportRows";

export interface SummaryViewProps {
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
    columns: DataTableColumn<SummaryRow>[];
    rows: SummaryRow[];
    loading: boolean;
    /** Reports rework, item 3 — `false` until the operator explicitly asks
     * for a report; swaps the empty message to a "pick a saved view / build
     * a report" prompt instead of "nothing in this group yet", since there
     * genuinely is data, it just hasn't been asked for. */
    reportApplied: boolean;
}

// Task: "we fixed the ticket view in report but not in summary view can you
// fix that as well" — ReportsScreen.module.css's `.tickets-table` bounds the
// Tickets table with a `--datatable-max-height` calc so it does its own
// internal scrolling and the bottom bar stays flush, but that calc only
// accounts for fixed chrome plus `--reports-filters-h` (ReportsCardBody.tsx's
// ResizeObserver over `.stickyFilters`) — it knows nothing about this view's
// own group-by `FieldGrid` row, which renders *inside* SummaryView, below
// `.stickyFilters`, and wasn't measured by anything. Reusing `.tickets-table`
// as-is would leave the table exactly `groupRow`'s rendered height (+ the
// `.body` grid's own row gap) too tall for the room actually left under it —
// same "double scroll" failure mode `--reports-filters-h` itself was built to
// avoid. This mirrors that same ResizeObserver pattern for the group-by row
// instead, exposing it as `--summary-group-h` on the wrapper below.
const useGroupRowHeight = (rootRef: React.RefObject<HTMLDivElement | null>, groupRef: React.RefObject<HTMLDivElement | null>): void => {
    useEffect(() => {
        const rootEl = rootRef.current;
        const groupEl = groupRef.current;
        if (!rootEl || !groupEl) return;
        const observer = new ResizeObserver(() => {
            rootEl.style.setProperty("--summary-group-h", `${groupEl.getBoundingClientRect().height}px`);
        });
        observer.observe(groupEl);
        return () => observer.disconnect();
    }, [rootRef, groupRef]);
};

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Summary-view group-by select + table,
// unchanged from the inline version it replaces except for the added
// loading spinner.
export const SummaryView = ({ groupBy, onGroupByChange, columns, rows, loading, reportApplied }: SummaryViewProps) => {
    const { t } = useTranslation();
    const rootRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    useGroupRowHeight(rootRef, groupRef);
    return (
        <div className={styles.summaryRoot} ref={rootRef}>
            <div ref={groupRef}>
                <FieldGrid columns={2}>
                    <Field id="rGroup" label={t("reports.groupByLabel")}>
                        <Select id="rGroup" value={groupBy} options={groupOptions(t)} onChange={onGroupByChange} />
                    </Field>
                </FieldGrid>
            </div>
            <div className={styles.summaryTable}>
                <DataTable
                    columns={columns}
                    rows={rows}
                    getRowId={(row) => row.key}
                    emptyMessage={
                        loading ? (
                            <span className={styles.loadingRow}>
                                <Spinner size="sm" label={t("reports.loading")} /> {t("reports.loading")}
                            </span>
                        ) : !reportApplied ? (
                            t("reports.selectReportEmpty")
                        ) : (
                            t("reports.summaryEmpty")
                        )
                    }
                />
            </div>
        </div>
    );
};
