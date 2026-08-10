import { useState } from "react";

import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { DEFAULT_TICKET_SCHEMA, ticketSchemaSchema, useSchema } from "@engines/schemaEngine";
import type { Field } from "@engines/schemaEngine";
import { languagePackSchema } from "@i18n/schemas";
import type { LanguagePack } from "@i18n/types";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./FieldsLanguagePane.module.css";

export interface FieldsLanguagePaneProps {
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
}

const PACK_COLUMNS: DataTableColumn<LanguagePack>[] = [
    { key: "code", header: "Code", render: (pack) => pack.Code },
    { key: "name", header: "Language", render: (pack) => pack.Name },
    {
        key: "strings",
        header: "Strings",
        numeric: true,
        render: (pack) => String(Object.keys(pack.Strings).length),
    },
    { key: "version", header: "Version", numeric: true, render: (pack) => String(pack.Version) },
];

interface FlashMessage {
    text: string;
    bad: boolean;
}

const fieldColumns = (lang: string): DataTableColumn<Field>[] => [
    { key: "id", header: "Field", render: (field) => field.FieldId },
    { key: "kind", header: "Kind", render: (field) => field.Kind },
    { key: "label", header: "Label", render: (field) => resolveLocalized(field.Label, lang) },
    { key: "indexed", header: "Indexed", render: (field) => (field.Indexed ? "Yes" : "") },
];

// Fields & language pane (demo/BabuScales-demo.html's `data-pane="fields"`).
//
// Field schema (task #50, PLAN §8.3) — the schema itself is real and
// persisted (`config` row, ConfigKind: "Schema", db/schema.ts) and its
// Labels genuinely drive Weighing's five built-in fields live
// (TicketFieldsCard.tsx reads it via `useSchema()`). What's still NOT
// built — documented, not attempted — is schema-driven field *rendering*:
// uploading a schema with a new custom FieldId doesn't add an input to
// Weighing, and `VisibleWhen`/`RequiredWhen`/`ReadOnlyWhen`/`Validate`
// formulas aren't evaluated against the ticket form. That's a separate,
// much larger feature (app/README.md known gap). Uploading a schema that
// only relabels/reorders/indexes the five existing FieldIds works today;
// a schema introducing new ones is accepted (it validates) but its extra
// fields are simply inert until that feature exists.
//
// Language packs: i18n/schemas.ts's languagePackSchema, I18nProvider's own
// doc comment ("loading is the caller's job") — `useTranslation().packs`
// is the live, already-loaded list (App.tsx loads it from `config` rows at
// startup); `onAddLanguagePack` is how a new one gets in — see App.tsx's
// `addLanguagePack`.
//
// The mock's own `dropLang`/`dropSchema` are real HTML5 drag-and-drop
// zones; this ports the click-to-choose half only (the `<input
// type="file">` each mock drop zone is built around) — same real
// parse/validate/save path, without also wiring `dragenter`/`dragover`/
// `drop` listeners nothing else in this codebase uses yet.
export const FieldsLanguagePane = ({ onAddLanguagePack }: FieldsLanguagePaneProps) => {
    const { packs, lang } = useTranslation();
    const { ticketSchema, setTicketSchema } = useSchema();
    const { unlocked } = useSettings();
    const [message, setMessage] = useState<FlashMessage | null>(null);
    const [busy, setBusy] = useState(false);
    const [schemaMessage, setSchemaMessage] = useState<FlashMessage | null>(null);
    const [schemaBusy, setSchemaBusy] = useState(false);

    const handleFile = async (file: File): Promise<void> => {
        setBusy(true);
        try {
            const text = await file.text();
            const parsed = languagePackSchema.safeParse(JSON.parse(text));
            if (!parsed.success) {
                setMessage({
                    text: `Not a language pack — ${parsed.error.issues[0]?.message ?? "invalid shape"}`,
                    bad: true,
                });
                return;
            }
            await onAddLanguagePack(parsed.data);
            setMessage({
                text: `Applied · ${parsed.data.Name} · ${Object.keys(parsed.data.Strings).length} strings`,
                bad: false,
            });
        } catch (err) {
            setMessage({
                text: `Not valid JSON — ${err instanceof Error ? err.message : String(err)}`,
                bad: true,
            });
        } finally {
            setBusy(false);
        }
    };

    const handleSchemaFile = async (file: File): Promise<void> => {
        setSchemaBusy(true);
        try {
            const text = await file.text();
            const parsed = ticketSchemaSchema.safeParse(JSON.parse(text));
            if (!parsed.success) {
                setSchemaMessage({
                    text: `Not a field schema — ${parsed.error.issues[0]?.message ?? "invalid shape"}`,
                    bad: true,
                });
                return;
            }
            await setTicketSchema(parsed.data);
            setSchemaMessage({
                text: `Applied · ${parsed.data.Fields.length} fields`,
                bad: false,
            });
        } catch (err) {
            setSchemaMessage({
                text: `Not valid JSON — ${err instanceof Error ? err.message : String(err)}`,
                bad: true,
            });
        } finally {
            setSchemaBusy(false);
        }
    };

    const resetSchema = async (): Promise<void> => {
        setSchemaBusy(true);
        try {
            await setTicketSchema(DEFAULT_TICKET_SCHEMA);
            setSchemaMessage({ text: "Reset to the built-in default schema", bad: false });
        } finally {
            setSchemaBusy(false);
        }
    };

    return (
        <div className={styles.grid}>
            <Card
                title={<span className="lbl">Field schema</span>}
                headerRight={<span className="chip num">{ticketSchema.Fields.length} fields</span>}
            >
                <div className={styles.body}>
                    <p className={styles.hint}>
                        Relabels, reorders, or indexes Weighing&apos;s existing fields. Custom
                        FieldIds validate and save but don&apos;t appear on the form yet —
                        schema-driven field rendering isn&apos;t built (app/README.md known gap).
                    </p>
                    <label
                        className={`${styles.drop} ${!unlocked ? styles.dropDisabled : ""}`}
                    >
                        <span className={styles.dropIcon}>⬆</span>
                        <span>
                            {schemaBusy
                                ? "Applying…"
                                : "Drop a field schema .json here, or click to choose"}
                        </span>
                        <input
                            type="file"
                            accept=".json,application/json"
                            hidden
                            disabled={schemaBusy || !unlocked}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                if (file) void handleSchemaFile(file);
                            }}
                        />
                    </label>
                    {unlocked && (
                        <button
                            type="button"
                            className={styles.resetButton}
                            disabled={schemaBusy}
                            onClick={() => void resetSchema()}
                        >
                            Reset to default
                        </button>
                    )}
                    {schemaMessage && (
                        <p className={schemaMessage.bad ? styles.bad : styles.applied}>
                            {schemaMessage.text}
                        </p>
                    )}
                    <DataTable
                        columns={fieldColumns(lang)}
                        rows={ticketSchema.Fields}
                        getRowId={(field) => field.FieldId}
                        emptyMessage="No fields in this schema"
                    />
                </div>
            </Card>
            <Card
                title={<span className="lbl">Language packs</span>}
                headerRight={<span className="chip num">{packs.length} installed</span>}
            >
                <div className={styles.body}>
                    <label className={`${styles.drop} ${!unlocked ? styles.dropDisabled : ""}`}>
                        <span className={styles.dropIcon}>⬆</span>
                        <span>
                            {busy ? "Applying…" : "Drop a language .json here, or click to choose"}
                        </span>
                        <input
                            type="file"
                            accept=".json,application/json"
                            hidden
                            disabled={busy || !unlocked}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                if (file) void handleFile(file);
                            }}
                        />
                    </label>
                    {message && (
                        <p className={message.bad ? styles.bad : styles.applied}>{message.text}</p>
                    )}
                    <DataTable
                        columns={PACK_COLUMNS}
                        rows={packs}
                        getRowId={(pack) => pack.Code}
                        emptyMessage="No language packs installed yet"
                    />
                </div>
            </Card>
        </div>
    );
};
