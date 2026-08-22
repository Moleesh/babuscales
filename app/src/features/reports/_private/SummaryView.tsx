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

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Summary-view group-by select + table,
// unchanged from the inline version it replaces except for the added
// loading spinner.
export const SummaryView = ({ groupBy, onGroupByChange, columns, rows, loading, reportApplied }: SummaryViewProps) => {
    const { t } = useTranslation();
    return (
        <>
            <FieldGrid columns={2}>
                <Field id="rGroup" label={t("reports.groupByLabel")}>
                    <Select id="rGroup" value={groupBy} options={groupOptions(t)} onChange={onGroupByChange} />
                </Field>
            </FieldGrid>
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
        </>
    );
};
