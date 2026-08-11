import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Field, FieldGrid } from "@components/Field";

import { GROUP_OPTIONS } from "../reportRows";
import type { GroupKey, SummaryRow } from "../reportRows";

export interface SummaryViewProps {
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
    columns: DataTableColumn<SummaryRow>[];
    rows: SummaryRow[];
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Summary-view group-by select + table,
// unchanged from the inline version it replaces.
export const SummaryView = ({ groupBy, onGroupByChange, columns, rows }: SummaryViewProps) => (
    <>
        <FieldGrid columns={2}>
            <Field id="rGroup" label={{ en: "Group by" }}>
                <select
                    id="rGroup"
                    value={groupBy}
                    onChange={(event) => onGroupByChange(event.target.value as GroupKey)}
                >
                    {GROUP_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </Field>
        </FieldGrid>
        <DataTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.key}
            emptyMessage="No completed tickets in this group yet"
        />
    </>
);
