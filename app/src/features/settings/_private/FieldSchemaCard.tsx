import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Select } from "@components/Select";
import { FIELD_LABEL_KEYS } from "@engines/schemaEngine";
import type { Field, Schema } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/FieldsLanguagePane.module.css";

// The 9 built-in fields carry no `Label` at all (defaultTicketSchema.ts) —
// same FieldId → i18n-key fallback the Weighing screen itself uses, so
// this table shows the same text an operator sees rather than a blank cell.
const fieldLabel = (field: Field, lang: string, t: (key: string) => string): string =>
    field.Label ? resolveLocalized(field.Label, lang) : t(FIELD_LABEL_KEYS[field.FieldId] ?? field.FieldId);

interface VisibilityToggleArgs {
    field: Field;
    unlocked: boolean;
    schemaBusy: boolean;
    t: (key: string) => string;
    onToggleVisible: (fieldId: string) => void;
}

// One row's own show/hide button (task: "add [a] button ... below the
// field ... to easily hide and show the field instead of changing them
// every time") — flips that field's `Visible` on the active schema and
// re-saves it, the same effect as hand-editing and re-uploading the JSON.
const VisibilityToggle = ({ field, unlocked, schemaBusy, t, onToggleVisible }: VisibilityToggleArgs) => {
    const visible = field.Visible !== false;
    return (
        <button
            type="button"
            className={`${styles.visibilityToggle} ${visible ? styles.visibilityOn : styles.visibilityOff}`}
            disabled={!unlocked || schemaBusy}
            onClick={() => onToggleVisible(field.FieldId)}
        >
            {visible ? t("settings.fieldSchema.show") : t("settings.fieldSchema.hide")}
        </button>
    );
};

interface FieldColumnsArgs {
    lang: string;
    t: (key: string) => string;
    unlocked: boolean;
    schemaBusy: boolean;
    onToggleVisible: (fieldId: string) => void;
}

const fieldColumns = ({
    lang,
    t,
    unlocked,
    schemaBusy,
    onToggleVisible,
}: FieldColumnsArgs): DataTableColumn<Field>[] => [
    { key: "id", header: t("settings.fieldSchema.col.field"), render: (field) => field.FieldId },
    { key: "kind", header: t("settings.fieldSchema.col.kind"), render: (field) => field.Kind },
    {
        key: "label",
        header: t("settings.fieldSchema.col.label"),
        render: (field) => fieldLabel(field, lang, t),
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

export interface FieldSchemaCardProps {
    ticketSchema: Schema;
    /** Every saved schema (built-in default + every upload) — task: "allow multiple uploads and have a drop to list them". */
    schemas: Schema[];
    lang: string;
    unlocked: boolean;
    schemaBusy: boolean;
    schemaMessage: { text: string; bad: boolean } | null;
    onSchemaFile: (file: File) => void;
    onReset: () => void;
    onSelectActiveSchema: (schemaId: string) => void;
    onToggleFieldVisible: (fieldId: string) => void;
}

// Split out so FieldSchemaCard stays under the per-function line budget
// (docs/CodingStandards.md) — purely a layout extraction, no behavior change.
const SchemaDropZone = ({
    unlocked,
    schemaBusy,
    onSchemaFile,
    t,
}: {
    unlocked: boolean;
    schemaBusy: boolean;
    onSchemaFile: (file: File) => void;
    t: (key: string) => string;
}) => (
    <label className={`${styles.drop} ${!unlocked ? styles.dropDisabled : ""}`}>
        <span className={styles.dropIcon}>⬆</span>
        <span>
            {schemaBusy ? t("settings.fieldSchema.dropApplying") : t("settings.fieldSchema.dropPrompt")}
        </span>
        <input
            type="file"
            accept=".json,application/json"
            hidden
            disabled={schemaBusy || !unlocked}
            onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onSchemaFile(file);
            }}
        />
    </label>
);

// The "which saved schema is active" picker — every upload keeps its own
// row (db/schema.ts's `ticketSchemaConfigId`, keyed by SchemaId), so
// switching here never touches a saved schema, only which one renders.
const ActiveSchemaSelect = ({
    ticketSchema,
    schemas,
    unlocked,
    schemaBusy,
    onSelectActiveSchema,
    t,
}: {
    ticketSchema: Schema;
    schemas: Schema[];
    unlocked: boolean;
    schemaBusy: boolean;
    onSelectActiveSchema: (schemaId: string) => void;
    t: (key: string) => string;
}) => (
    <div className={styles.activeSchemaRow}>
        <span className="lbl">{t("settings.fieldSchema.activeLabel")}</span>
        <Select
            value={ticketSchema.SchemaId}
            options={schemas.map((schema) => ({ value: schema.SchemaId, label: schema.SchemaId }))}
            disabled={!unlocked || schemaBusy}
            onChange={onSelectActiveSchema}
        />
    </div>
);

// The card's own body — split out of FieldSchemaCard purely to stay under
// the per-function line budget (docs/CodingStandards.md), no behavior split.
const FieldSchemaCardBody = ({
    ticketSchema,
    schemas,
    lang,
    unlocked,
    schemaBusy,
    schemaMessage,
    onSchemaFile,
    onReset,
    onSelectActiveSchema,
    onToggleFieldVisible,
}: FieldSchemaCardProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.body}>
            <p className={styles.hint}>{t("settings.fieldSchema.hint")}</p>
            {schemas.length > 1 && (
                <ActiveSchemaSelect
                    ticketSchema={ticketSchema}
                    schemas={schemas}
                    unlocked={unlocked}
                    schemaBusy={schemaBusy}
                    onSelectActiveSchema={onSelectActiveSchema}
                    t={t}
                />
            )}
            <SchemaDropZone unlocked={unlocked} schemaBusy={schemaBusy} onSchemaFile={onSchemaFile} t={t} />
            {unlocked && (
                <button type="button" className={styles.resetButton} disabled={schemaBusy} onClick={onReset}>
                    {t("settings.fieldSchema.resetToDefault")}
                </button>
            )}
            {schemaMessage && (
                <p className={schemaMessage.bad ? styles.bad : styles.applied}>{schemaMessage.text}</p>
            )}
            <DataTable
                columns={fieldColumns({ lang, t, unlocked, schemaBusy, onToggleVisible: onToggleFieldVisible })}
                rows={ticketSchema.Fields}
                getRowId={(field) => field.FieldId}
                emptyMessage={t("settings.fieldSchema.empty")}
            />
        </div>
    );
};

// Split out of FieldsLanguagePane (over the line budget — docs/CodingStandards.md)
// — the "Field schema" card, unchanged from the inline version it replaces.
export const FieldSchemaCard = (props: FieldSchemaCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            title={<span className="lbl">{t("settings.fieldSchema.title")}</span>}
            headerRight={
                <span className="chip num">
                    {props.ticketSchema.Fields.length} {t("settings.fieldSchema.fieldsSuffix")}
                </span>
            }
        >
            <FieldSchemaCardBody {...props} />
        </Card>
    );
};
