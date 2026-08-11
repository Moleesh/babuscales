import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import type { Field, Schema } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";

import styles from "./FieldsLanguagePane.module.css";

const fieldColumns = (lang: string): DataTableColumn<Field>[] => [
    { key: "id", header: "Field", render: (field) => field.FieldId },
    { key: "kind", header: "Kind", render: (field) => field.Kind },
    { key: "label", header: "Label", render: (field) => resolveLocalized(field.Label, lang) },
    { key: "indexed", header: "Indexed", render: (field) => (field.Indexed ? "Yes" : "") },
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
}: FieldSchemaCardProps) => (
    <Card
        title={<span className="lbl">Field schema</span>}
        headerRight={<span className="chip num">{ticketSchema.Fields.length} fields</span>}
    >
        <div className={styles.body}>
            <p className={styles.hint}>
                Relabels, reorders, or indexes Weighing&apos;s existing fields. Custom FieldIds
                validate and save but don&apos;t appear on the form yet — schema-driven field
                rendering isn&apos;t built (app/README.md known gap).
            </p>
            <label className={`${styles.drop} ${!unlocked ? styles.dropDisabled : ""}`}>
                <span className={styles.dropIcon}>⬆</span>
                <span>
                    {schemaBusy ? "Applying…" : "Drop a field schema .json here, or click to choose"}
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
            {unlocked && (
                <button
                    type="button"
                    className={styles.resetButton}
                    disabled={schemaBusy}
                    onClick={onReset}
                >
                    Reset to default
                </button>
            )}
            {schemaMessage && (
                <p className={schemaMessage.bad ? styles.bad : styles.applied}>{schemaMessage.text}</p>
            )}
            <DataTable
                columns={fieldColumns(lang)}
                rows={ticketSchema.Fields}
                getRowId={(field) => field.FieldId}
                emptyMessage="No fields in this schema"
            />
        </div>
    </Card>
);
