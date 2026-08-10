import { useRef, useState } from "react";

import { Card } from "@components/Card";
import { useDataPort } from "@db/useDataPort";

import { useSettings } from "../useSettings";
import styles from "./SystemPane.module.css";

// Mock's own `flash()` timing, reused from SystemPane's LicenceCard.
const FLASH_MS = 3000;

const timestampForFilename = (): string => {
    const now = new Date();
    const pad = (n: number): string => String(n).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
};

interface FlashMessage {
    text: string;
    bad: boolean;
}

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
    const [message, setMessage] = useState<FlashMessage | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmingRestore, setConfirmingRestore] = useState(false);
    const pendingFile = useRef<File | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showFlash = (text: string, bad = false): void => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setMessage({ text, bad });
        flashTimer.current = setTimeout(() => setMessage(null), FLASH_MS);
    };

    const handleExport = async (): Promise<void> => {
        setBusy(true);
        try {
            const bytes = await db.exportBackup();
            // `Uint8Array<ArrayBufferLike>` isn't assignable to `BlobPart` under
            // this project's TS/DOM lib version — a fresh copy backed by a
            // plain `ArrayBuffer` satisfies it without changing the bytes.
            const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `babuscales-backup-${timestampForFilename()}.bak`;
            link.click();
            URL.revokeObjectURL(url);
            showFlash(`Backup saved · ${(bytes.byteLength / 1024).toFixed(0)} KB`);
        } catch (err) {
            showFlash(`Backup failed — ${err instanceof Error ? err.message : String(err)}`, true);
        } finally {
            setBusy(false);
        }
    };

    const handleRestore = async (): Promise<void> => {
        const file = pendingFile.current;
        if (!file) return;
        setConfirmingRestore(false);
        setBusy(true);
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            await db.importBackup(bytes);
            showFlash("Restored — this file's data replaced everything that was here.");
        } catch (err) {
            showFlash(`Restore failed — ${err instanceof Error ? err.message : String(err)}`, true);
        } finally {
            setBusy(false);
            pendingFile.current = null;
        }
    };

    return (
        <Card title={<span className="lbl">Backup &amp; restore</span>}>
            <div className={styles.body}>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={busy}
                        onClick={() => void handleExport()}
                    >
                        {busy ? "Working…" : "Save a backup"}
                    </button>
                    <label
                        className={`${styles.mini} ${!unlocked || busy ? styles.miniLabelDisabled : ""}`}
                    >
                        Restore from a backup…
                        <input
                            type="file"
                            accept=".bak,.db"
                            hidden
                            disabled={!unlocked || busy}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                if (file) {
                                    pendingFile.current = file;
                                    setConfirmingRestore(true);
                                }
                            }}
                        />
                    </label>
                </div>
                {confirmingRestore && (
                    <div className={styles.confirmRow}>
                        <span>
                            Restore &quot;{pendingFile.current?.name}&quot;? Everything currently
                            saved here — every ticket, master and setting — is replaced. This
                            can&apos;t be undone.
                        </span>
                        <button
                            type="button"
                            className={`${styles.mini} ${styles.danger}`}
                            onClick={() => void handleRestore()}
                        >
                            Yes, restore
                        </button>
                        <button
                            type="button"
                            className={styles.mini}
                            onClick={() => {
                                setConfirmingRestore(false);
                                pendingFile.current = null;
                            }}
                        >
                            Cancel
                        </button>
                    </div>
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
