import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/FieldsLanguagePane.module.css";

const packColumns = (t: (key: string) => string): DataTableColumn<LanguagePack>[] => [
    { key: "code", header: t("settings.languagePacks.col.code"), render: (pack) => pack.Code },
    { key: "name", header: t("settings.languagePacks.col.language"), render: (pack) => pack.Name },
    {
        key: "strings",
        header: t("settings.languagePacks.col.strings"),
        numeric: true,
        render: (pack) => String(Object.keys(pack.Strings).length),
    },
    {
        key: "version",
        header: t("settings.languagePacks.col.version"),
        numeric: true,
        render: (pack) => String(pack.Version),
    },
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
export const LanguagePacksCard = ({ packs, unlocked, busy, message, onFile }: LanguagePacksCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            title={<span className="lbl">{t("settings.languagePacks.title")}</span>}
            headerRight={
                <span className="chip num">
                    {packs.length} {t("settings.languagePacks.installedSuffix")}
                </span>
            }
        >
            <div className={styles.body}>
                <label className={`${styles.drop} ${!unlocked ? styles.dropDisabled : ""}`}>
                    <span className={styles.dropIcon}>⬆</span>
                    <span>
                        {busy
                            ? t("settings.languagePacks.dropApplying")
                            : t("settings.languagePacks.dropPrompt")}
                    </span>
                    <input
                        type="file"
                        accept=".lang,.txt,text/plain,.json,application/json"
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
                    columns={packColumns(t)}
                    rows={packs}
                    getRowId={(pack) => pack.Code}
                    emptyMessage={t("settings.languagePacks.empty")}
                />
            </div>
        </Card>
    );
};
