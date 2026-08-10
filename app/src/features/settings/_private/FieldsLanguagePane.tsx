import { useState } from "react";

import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { languagePackSchema } from "@i18n/schemas";
import type { LanguagePack } from "@i18n/types";
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

// Fields & language pane (demo/BabuScales-demo.html's `data-pane="fields"`)
// — the Language packs half only. "Field schema" (drop a schema .json to
// change field labels/required-ness live) stays a documented placeholder:
// it needs schema-driven field rendering, a separate and much larger
// feature this app doesn't have (app/README.md known gap) — Weighing's
// fields are a fixed layout, not read from an uploaded Schema row.
//
// Language packs are simpler, and every other piece already existed —
// i18n/schemas.ts's languagePackSchema, I18nProvider's own doc comment
// ("loading is the caller's job") — just never wired to a real upload
// path. `useTranslation().packs` is the live, already-loaded list
// (App.tsx loads it from `config` rows at startup); `onAddLanguagePack`
// is how a new one gets in — see App.tsx's `addLanguagePack`.
//
// The mock's own `dropLang` is a real HTML5 drag-and-drop zone; this
// ports the click-to-choose half only (the `<input type="file">` the
// mock's own drop zone is built around) — same real parse/validate/save
// path, without also wiring `dragenter`/`dragover`/`drop` listeners
// nothing else in this codebase uses yet.
export const FieldsLanguagePane = ({ onAddLanguagePack }: FieldsLanguagePaneProps) => {
    const { packs } = useTranslation();
    const { unlocked } = useSettings();
    const [message, setMessage] = useState<FlashMessage | null>(null);
    const [busy, setBusy] = useState(false);

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

    return (
        <div className={styles.grid}>
            <Card title={<span className="lbl">Field schema</span>}>
                <p className={styles.hint}>
                    Uploading a schema .json to change field labels and required-ness needs
                    schema-driven field rendering, which isn&apos;t built yet (app/README.md known
                    gap) — Weighing&apos;s fields are still a fixed layout.
                </p>
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
