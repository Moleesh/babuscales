import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/SystemPane.module.css";

export interface BackupActionsRowProps {
    busy: boolean;
    unlocked: boolean;
    onExport: () => void;
    onSelectFile: (file: File) => void;
}

// Split out of BackupRestoreCard (over the line budget — docs/CodingStandards.md)
// — the "Save a backup" button + "Restore from a backup…" file picker row,
// unchanged from the inline version it replaces.
export const BackupActionsRow = ({ busy, unlocked, onExport, onSelectFile }: BackupActionsRowProps) => {
    const { t } = useTranslation();
    return (
    <div className={styles.statusRow}>
        <button type="button" className={styles.mini} disabled={busy} onClick={onExport}>
            {busy ? t("settings.backup.working") : t("settings.backup.saveBackup")}
        </button>
        <label className={`${styles.mini} ${!unlocked || busy ? styles.miniLabelDisabled : ""}`}>
            {t("settings.backup.restore")}
            <input
                type="file"
                accept=".bak,.db"
                hidden
                disabled={!unlocked || busy}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) onSelectFile(file);
                }}
            />
        </label>
    </div>
    );
};
