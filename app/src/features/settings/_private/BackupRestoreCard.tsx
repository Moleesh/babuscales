import { Card } from "@components/Card";
import { useDataPort } from "@db/useDataPort";

import { useSettings } from "../useSettings";
import { BackupActionsRow } from "./BackupActionsRow";
import { RestoreConfirmRow } from "./RestoreConfirmRow";
import styles from "./SystemPane.module.css";
import { useBackupRestoreActions } from "./useBackupRestoreActions";

// PLAN §14 "real data must never exist without a way out of the file it
// lives in" — item 6 built DataPort.exportBackup/importBackup and the real
// work behind them (Rust: VACUUM INTO + integrity check + SHA-256
// checksum, src-tauri/src/store/backup.rs; web demo: a full JSON snapshot,
// src/db/adapters/memory/backup.ts) and verified the round trip, but never
// wired either method to anything an admin could actually click — task #6
// was "done" at the engine layer only. This card is that missing wire.
//
// Plain Blob download / `<input type="file">` upload, the same
// browser-native mechanism FieldsLanguagePane's language-pack picker
// already uses — no Tauri dialog plugin needed, and it works identically
// in the web demo and the real Tauri build. The two adapters' bytes are
// different formats (SQLite file vs. JSON snapshot) so the saved file gets
// a neutral `.bak` extension rather than claiming to be a `.db`.
export const BackupRestoreCard = () => {
    const db = useDataPort();
    const { unlocked } = useSettings();
    const {
        message,
        busy,
        confirmingRestore,
        pendingFileName,
        handleExport,
        selectFile,
        handleRestore,
        cancelRestore,
    } = useBackupRestoreActions(db);

    return (
        <Card title={<span className="lbl">Backup &amp; restore</span>}>
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
                <p className={styles.hint}>
                    Saving works even when Settings is locked — take a backup any time. Restoring
                    needs the admin password, since it replaces everything currently saved here.
                    Keep a copy of the saved file off this machine too — on a USB stick or another
                    computer — so a backup that only ever lived next to the database it protects
                    doesn&apos;t go down with it.
                </p>
            </div>
        </Card>
    );
};
