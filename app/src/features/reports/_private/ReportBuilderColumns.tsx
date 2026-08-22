import { resolveFieldIdLabel, useSchema } from "@engines/schemaEngine";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";
import { reportableSchemaFields } from "./reportColumns";
import { fieldColumnKey, ticketColumnOptions } from "../reportRows";

export interface ReportBuilderColumnsProps {
    visibleColumnKeys: string[] | null;
    onVisibleColumnKeysChange: (keys: string[] | null) => void;
}

// Split out of ReportBuilderModal (over the line/complexity budget —
// docs/CodingStandards.md) — the "which columns" checkbox grid. `null`
// means "all columns", same convention buildTicketColumns itself uses, so
// every box shows checked when nothing has been unchecked yet.
//
// Reports rework, item 5 — "i have godown fields selected by the report not
// showing them". The fixed 10 built-in columns (`ticketColumnOptions`)
// used to be the only checkboxes here at all — there was no way to even
// *pick* a custom schema field as a report column, let alone have it show
// up. Now appends one checkbox per `reportableSchemaFields(ticketSchema)`
// (reportColumns.tsx) — the active schema's custom fields, keyed
// `fieldColumnKey(FieldId)` (reportRows.ts) so they can never collide with
// the built-in keys — and reportColumns.tsx's `buildTicketColumns` already
// knows how to render a column for that key (it's generic over string keys
// now), so checking one here is enough to make it show up in the table.
export const ReportBuilderColumns = ({
    visibleColumnKeys,
    onVisibleColumnKeysChange,
}: ReportBuilderColumnsProps) => {
    const { t } = useTranslation();
    const { ticketSchema } = useSchema();
    const options = ticketColumnOptions(t);
    const fieldOptions = reportableSchemaFields(ticketSchema).map((field) => ({
        value: fieldColumnKey(field.FieldId),
        label: resolveFieldIdLabel(field.FieldId, t),
    }));
    const allKeys = [...options.map((option) => option.value), ...fieldOptions.map((option) => option.value)];
    const selected = visibleColumnKeys ?? allKeys;

    const toggle = (key: string): void => {
        const next = selected.includes(key)
            ? selected.filter((existing) => existing !== key)
            : [...selected, key];
        onVisibleColumnKeysChange(next.length === allKeys.length ? null : next);
    };

    return (
        <fieldset className={styles.columns}>
            <legend>{t("reports.builder.columnsLabel")}</legend>
            {options.map((option) => (
                <label key={option.value} className={styles.columnItem}>
                    <input
                        type="checkbox"
                        checked={selected.includes(option.value)}
                        onChange={() => toggle(option.value)}
                    />
                    {option.label}
                </label>
            ))}
            {fieldOptions.map((option) => (
                <label key={option.value} className={styles.columnItem}>
                    <input
                        type="checkbox"
                        checked={selected.includes(option.value)}
                        onChange={() => toggle(option.value)}
                    />
                    {option.label}
                </label>
            ))}
        </fieldset>
    );
};
