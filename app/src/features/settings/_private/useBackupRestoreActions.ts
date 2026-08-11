import { useRef, useState } from "react";

import { timestampForFilename } from "@constants/timestampForFilename";
import type { DataPort } from "@db/DataPort";

// Mock's own `flash()` timing, reused from SystemPane's LicenceCard.
const FLASH_MS = 3000;

interface FlashMessage {
    text: string;
    bad: boolean;
}

// Triggers a same-tab download of the exported bytes and returns their size
// in KB for the flash message. Plain function (no hooks) so it doesn't
// count against useBackupRestoreActions's own line budget.
const downloadBackupBlob = (bytes: Uint8Array): number => {
    // `Uint8Array<ArrayBufferLike>` isn't assignable to `BlobPart` under this
    // project's TS/DOM lib version — a fresh copy backed by a plain
    // `ArrayBuffer` satisfies it without changing the bytes.
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `babuscales-backup-${timestampForFilename()}.bak`;
    link.click();
    URL.revokeObjectURL(url);
    return bytes.byteLength / 1024;
};

export interface UseBackupRestoreActions {
    message: FlashMessage | null;
    busy: boolean;
    confirmingRestore: boolean;
    pendingFileName: string | undefined;
    handleExport: () => Promise<void>;
    selectFile: (file: File) => void;
    handleRestore: () => Promise<void>;
    cancelRestore: () => void;
}

// Split out of BackupRestoreCard (over the line budget — docs/CodingStandards.md)
// — every stateful piece (the flash message, the busy flag, the pending
// restore file, and the export/restore handlers themselves), unchanged from
// the inline versions they replace.
export const useBackupRestoreActions = (db: DataPort): UseBackupRestoreActions => {
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
            const kb = downloadBackupBlob(bytes);
            showFlash(`Backup saved · ${kb.toFixed(0)} KB`);
        } catch (err) {
            showFlash(`Backup failed — ${err instanceof Error ? err.message : String(err)}`, true);
        } finally {
            setBusy(false);
        }
    };

    const selectFile = (file: File): void => {
        pendingFile.current = file;
        setConfirmingRestore(true);
    };

    const cancelRestore = (): void => {
        setConfirmingRestore(false);
        pendingFile.current = null;
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

    return {
        message,
        busy,
        confirmingRestore,
        pendingFileName: pendingFile.current?.name,
        handleExport,
        selectFile,
        handleRestore,
        cancelRestore,
    };
};
