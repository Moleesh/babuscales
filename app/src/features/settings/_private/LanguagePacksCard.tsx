import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import type { LanguagePack } from "@i18n/types";

import styles from "./_styles/FieldsLanguagePane.module.css";

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

export interface LanguagePacksCardProps {
    packs: LanguagePack[];
    unlocked: boolean;
    busy: boolean;
    message: { text: string; bad: boolean } | null;
    onFile: (file: File) => void;
}

// Split out of FieldsLanguagePane (over the line budget — docs/CodingStandards.md)
// — the "Language packs" card, unchanged from the inline version it
// replaces.
export const LanguagePacksCard = ({ packs, unlocked, busy, message, onFile }: LanguagePacksCardProps) => (
    <Card
        title={<span className="lbl">Language packs</span>}
        headerRight={<span className="chip num">{packs.length} installed</span>}
    >
        <div className={styles.body}>
            <label className={`${styles.drop} ${!unlocked ? styles.dropDisabled : ""}`}>
                <span className={styles.dropIcon}>⬆</span>
                <span>{busy ? "Applying…" : "Drop a language .json here, or click to choose"}</span>
                <input
                    type="file"
                    accept=".json,application/json"
                    hidden
                    disabled={busy || !unlocked}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) onFile(file);
                    }}
                />
            </label>
            {message && <p className={message.bad ? styles.bad : styles.applied}>{message.text}</p>}
            <DataTable
                columns={PACK_COLUMNS}
                rows={packs}
                getRowId={(pack) => pack.Code}
                emptyMessage="No language packs installed yet"
            />
        </div>
    </Card>
);
