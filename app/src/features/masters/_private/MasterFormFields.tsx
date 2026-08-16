import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import type { MasterColumn } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { masterColumnLabel } from "../masterKindMeta";
import type { MasterFormState } from "./masterFormState";

export interface MasterFormFieldsProps {
    columns: MasterColumn[];
    lang: string;
    form: MasterFormState;
    onChange: (next: MasterFormState) => void;
}

const gridColumns = (count: number): 2 | 3 | 4 => (count >= 3 ? 4 : count === 2 ? 3 : 2);

const MasterColumnInput = ({
    column,
    lang,
    value,
    onChange,
}: {
    column: MasterColumn;
    lang: string;
    value: string;
    onChange: (value: string) => void;
}) => {
    const inputId = `mf-${column.FieldId}`;
    if (column.Kind === "Boolean") {
        return (
            <input
                id={inputId}
                type="checkbox"
                checked={value === "true"}
                onChange={(event) => onChange(event.target.checked ? "true" : "false")}
            />
        );
    }
    if (column.Kind === "Select") {
        return (
            <Select
                id={inputId}
                value={value}
                options={(column.Options ?? []).map((option) => ({ value: option.Value, label: resolveLocalized(option.Label, lang) }))}
                onChange={onChange}
            />
        );
    }
    const numeric = column.Kind === "Number" || column.Kind === "Money";
    return (
        <input
            id={inputId}
            type={numeric ? "number" : "text"}
            inputMode={numeric ? "decimal" : undefined}
            min={numeric ? 0 : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
        />
    );
};

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Name field plus every schema-declared
// Masters column (Schema.Masters, App.tsx's ticketSchema) for the active
// kind, replacing what used to be a fixed notes/rate/email/phone shape
// hardcoded per-kind here — lets you specify what all column a master needs,
// that's how the master have to be populated. Stored Tare has
// its own StoredTareFormFields instead — it isn't schema-driven.
export const MasterFormFields = ({ columns, lang, form, onChange }: MasterFormFieldsProps) => {
    const { t } = useTranslation();
    return (
        <FieldGrid columns={gridColumns(columns.length)}>
            <Field id="mfName" label={t("masters.field.name")}>
                <input
                    id="mfName"
                    value={form.name}
                    onChange={(event) => onChange({ ...form, name: event.target.value })}
                    autoComplete="off"
                />
            </Field>
            {columns.map((column) => (
                <Field key={column.FieldId} id={`mf-${column.FieldId}`} label={masterColumnLabel(column, lang, t)}>
                    <MasterColumnInput
                        column={column}
                        lang={lang}
                        value={form.extra[column.FieldId] ?? ""}
                        onChange={(value) =>
                            onChange({ ...form, extra: { ...form.extra, [column.FieldId]: value } })
                        }
                    />
                </Field>
            ))}
        </FieldGrid>
    );
};
