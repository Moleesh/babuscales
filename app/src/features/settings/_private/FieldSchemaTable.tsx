import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Tooltip } from "@components/Tooltip";
import { FIELD_LABEL_KEYS, FIELD_LABEL_PREFIX, getAllFields, resolveFieldLabel } from "@engines/schemaEngine";
import type { Field, Schema } from "@engines/schemaEngine";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/FieldsLanguagePane.module.css";

// Split out of FieldSchemaCard (over the line budget — docs/CodingStandards.md)
// — the Fields DataTable itself (columns, per-row visibility toggle, label
// resolution), no behavior split.

// Reserved preview-language codes, not real pack `Code`s — task: "add one
// more here ie) key and english". `PREVIEW_KEY_CODE` shows each row's raw
// i18n key untranslated (handy for spotting which key a label actually
// resolves to). Plain `"en"` doubles as the literal-English code: it's also
// what an "en" override pack (LanguageTableCard.tsx's `enPack`) would use,
// and `previewT`'s own fallback chain (FieldsLanguagePane.tsx) already
// lands on `EN_STRINGS` when no pack matches, so no override pack existing
// yet still resolves it correctly — only add it as its own option when
// nothing already provides that code.
export const PREVIEW_KEY_CODE = "__key__";

// No field needs a `Label` at all now (task: "labels in the json we dont
// need it") — same FieldId → `weigh.label.` i18n-key fallback the
// Weighing screen itself uses (`resolveFieldIdLabel`), so this table shows
// the same text an operator sees rather than a blank cell.
//
// "Key" preview mode ("not having keys / we need consistency" — a field
// with its own inline `Label` used to always show that literal text, even
// in Key mode, while every other row showed its i18n key) has to bypass
// `field.Label` entirely: an inline Label carries no key at all, so the
// only key-shaped thing to show is the same `weigh.label.<FieldId>`
// convention `resolveFieldIdLabel` falls back to for key-less fields.
const fieldLabel = (field: Field, lang: string, t: (key: string) => string): string => {
    if (lang === PREVIEW_KEY_CODE) return FIELD_LABEL_KEYS[field.FieldId] ?? FIELD_LABEL_PREFIX + field.FieldId;
    return resolveFieldLabel(field, lang, t);
};

interface VisibilityToggleArgs {
    field: Field;
    unlocked: boolean;
    schemaBusy: boolean;
    t: (key: string) => string;
    onToggleVisible: (fieldId: string) => void;
}

// One row's own show/hide button — lets an operator easily hide and show
// the field instead of changing them every time; flips that field's `Visible` on the active schema and
// re-saves it, the same effect as hand-editing and re-uploading the JSON.
// Every field in this table — Gross/Tare included — honors `Visible` the
// same way (CalcCard.tsx's `isBoxVisible`), so they all get the same
// Hide/Show toggle; no more "Always shown" exception now that hiding
// Gross/Tare here actually does something.
const VisibilityToggle = ({ field, unlocked, schemaBusy, t, onToggleVisible }: VisibilityToggleArgs) => {
    const visible = field.Visible !== false;
    return (
        <button
            type="button"
            className={`${styles.visibilityToggle} ${visible ? "" : styles.visibilityOff}`}
            disabled={!unlocked || schemaBusy}
            onClick={() => onToggleVisible(field.FieldId)}
        >
            {visible ? t("settings.fieldSchema.hide") : t("settings.fieldSchema.show")}
        </button>
    );
};

interface FieldColumnsArgs {
    lang: string;
    t: (key: string) => string;
    labelT: (key: string) => string;
    unlocked: boolean;
    schemaBusy: boolean;
    onToggleVisible: (fieldId: string) => void;
}

const fieldColumns = ({
    lang,
    t,
    labelT,
    unlocked,
    schemaBusy,
    onToggleVisible,
}: FieldColumnsArgs): DataTableColumn<Field>[] => [
    { key: "id", header: t("settings.fieldSchema.col.field"), render: (field) => field.FieldId },
    { key: "kind", header: t("settings.fieldSchema.col.kind"), render: (field) => field.Kind },
    {
        key: "label",
        header: t("settings.fieldSchema.col.label"),
        // A Formula field's own expression shown under its label — the
        // table has no separate "Formula" column, so this stays the
        // least-disruptive spot for it (task: "show a field's Formula
        // string in the Fields & language table when Kind is Formula").
        render: (field) => (
            <>
                {fieldLabel(field, lang, labelT)}
                {field.Kind === "Formula" && field.Formula && (
                    // Task: "if the formula is big truncate it ... truncate
                    // should follow the tooltip that we implement not the
                    // generic one" — themed Tooltip (components/Tooltip)
                    // instead of a native `title` attribute, same as every
                    // other truncated-text tooltip in the app.
                    <Tooltip label={field.Formula} style={{ display: "block", minWidth: 0 }}>
                        <div className={styles.formula}>{field.Formula}</div>
                    </Tooltip>
                )}
            </>
        ),
    },
    {
        key: "visible",
        header: t("settings.fieldSchema.col.visible"),
        render: (field) => (
            <VisibilityToggle
                field={field}
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                t={t}
                onToggleVisible={onToggleVisible}
            />
        ),
    },
];

export interface FieldSchemaTableProps {
    ticketSchema: Schema;
    lang: string;
    labelT: (key: string) => string;
    unlocked: boolean;
    schemaBusy: boolean;
    onToggleFieldVisible: (fieldId: string) => void;
}

// The Fields DataTable itself — split out of FieldSchemaCardBody purely to
// stay under the per-function line budget (docs/CodingStandards.md), no
// behavior split.
export const FieldSchemaTable = ({
    ticketSchema,
    lang,
    labelT,
    unlocked,
    schemaBusy,
    onToggleFieldVisible,
}: FieldSchemaTableProps) => {
    const { t } = useTranslation();
    return (
        <DataTable
            columns={fieldColumns({
                lang,
                t,
                labelT,
                // Hide/Show stays behind the real admin lock too — see the
                // drop-zone's doc comment in FieldSchemaCard.
                unlocked,
                schemaBusy,
                onToggleVisible: onToggleFieldVisible,
            })}
            rows={getAllFields(ticketSchema)}
            getRowId={(field) => field.FieldId}
            emptyMessage={t("settings.fieldSchema.empty")}
        />
    );
};
