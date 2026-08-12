import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import type { Field, Schema } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/FieldsLanguagePane.module.css";

const fieldColumns = (lang: string, t: (key: string) => string): DataTableColumn<Field>[] => [
    { key: "id", header: t("settings.fieldSchema.col.field"), render: (field) => field.FieldId },
    { key: "kind", header: t("settings.fieldSchema.col.kind"), render: (field) => field.Kind },
    {
        key: "label",
        header: t("settings.fieldSchema.col.label"),
        render: (field) => resolveLocalized(field.Label, lang),
    },
    {
        key: "indexed",
        header: t("settings.fieldSchema.col.indexed"),
        render: (field) => (field.Indexed ? "Yes" : ""),
    },
];

export interface FieldSchemaCardProps {
    ticketSchema: Schema;
    lang: string;
    unlocked: boolean;
    schemaBusy: boolean;
    schemaMessage: { text: string; bad: boolean } | null;
    onSchemaFile: (file: File) => void;
    onReset: () => void;
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

// Split out of FieldsLanguagePane (over the line budget — docs/CodingStandards.md)
// — the "Field schema" card, unchanged from the inline version it replaces.
export const FieldSchemaCard = ({
    ticketSchema,
    lang,
    unlocked,
    schemaBusy,
    schemaMessage,
    onSchemaFile,
    onReset,
}: FieldSchemaCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            title={<span className="lbl">{t("settings.fieldSchema.title")}</span>}
            headerRight={
                <span className="chip num">
                    {ticketSchema.Fields.length} {t("settings.fieldSchema.fieldsSuffix")}
                </span>
            }
        >
            <div className={styles.body}>
                <p className={styles.hint}>{t("settings.fieldSchema.hint")}</p>
                <SchemaDropZone
                    unlocked={unlocked}
                    schemaBusy={schemaBusy}
                    onSchemaFile={onSchemaFile}
                    t={t}
                />
                {unlocked && (
                    <button
                        type="button"
                        className={styles.resetButton}
                        disabled={schemaBusy}
                        onClick={onReset}
                    >
                        {t("settings.fieldSchema.resetToDefault")}
                    </button>
                )}
                {schemaMessage && (
                    <p className={schemaMessage.bad ? styles.bad : styles.applied}>
                        {schemaMessage.text}
                    </p>
                )}
                <DataTable
                    columns={fieldColumns(lang, t)}
                    rows={ticketSchema.Fields}
                    getRowId={(field) => field.FieldId}
                    emptyMessage={t("settings.fieldSchema.empty")}
                />
            </div>
        </Card>
    );
};
