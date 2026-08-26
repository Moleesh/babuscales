import { Card } from "@components/Card";
import { useDataPort } from "@db/useDataPort";
import { useSchema } from "@engines/schemaEngine";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/SystemPane.module.css";
import { BackupActionsRow } from "./BackupActionsRow";
import { RestoreConfirmRow } from "./RestoreConfirmRow";
import { useBackupRestoreActions } from "./useBackupRestoreActions";

// "Real data must never exist without a way out of the file it
// lives in" — DataPort.exportBackup/importBackup and the real
// work behind them (Rust: VACUUM INTO + integrity check + SHA-256
// checksum, src-tauri/src/store/backup.rs; web demo: a full JSON snapshot,
// src/db/adapters/memory/backup.ts) were built and the round trip was
// verified, but neither method was ever wired to anything an admin could
// actually click — that was "done" at the engine layer only. This card is
// that missing wire.
//
// Plain Blob download / `<input type="file">` upload, the same
// browser-native mechanism FieldsLanguagePane's language-pack picker
// already uses — no Tauri dialog plugin needed, and it works identically
// in the web demo and the real Tauri build. The two adapters' bytes are
// different formats (SQLite file vs. JSON snapshot) so the saved file gets
// a neutral `.bak` extension rather than claiming to be a `.db`.
export const BackupRestoreCard = () => {
    const db = useDataPort();
    const { unlocked, reload: reloadSettings } = useSettings();
    const { reloadTicketSchema } = useSchema();
    const { t } = useTranslation();
    const {
        message,
        busy,
        confirmingRestore,
        pendingFileName,
        handleExport,
        selectFile,
        handleRestore,
        cancelRestore,
    } = useBackupRestoreActions(db, { settings: reloadSettings, ticketSchema: reloadTicketSchema });

    return (
        <Card
            sticky
            title={<span className="lbl">{t("settings.backup.cardTitle")}</span>}>
            <div className={styles.body}>
                <BackupActionsRow
                    busy={busy}
                    unlocked={unlocked}
                    onExport={() => void handleExport()}
                    onSelectFile={selectFile}
                />
                {confirmingRestore && (
                    <RestoreConfirmRow
                        fileName={pendingFileName}
                        onConfirm={() => void handleRestore()}
                        onCancel={cancelRestore}
                    />
                )}
                {message && <p className={message.bad ? styles.bad : styles.applied}>{message.text}</p>}
                <p className={styles.hint}>{t("settings.backup.hint")}</p>
            </div>
        </Card>
    );
};
