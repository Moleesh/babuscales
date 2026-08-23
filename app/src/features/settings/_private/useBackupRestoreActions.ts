import { useEffect, useRef, useState } from "react";

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

// The export side of handleExport, pulled out for the same line-budget
// reason as `restoreFromFile` below — unchanged from the inline version it
// replaces.
const runExport = async (
    db: DataPort,
    setBusy: (busy: boolean) => void,
    showFlash: (text: string, bad?: boolean) => void,
): Promise<void> => {
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

// The restore side of handleRestore, pulled out purely to keep
// useBackupRestoreActions under its own line budget — imports the file,
// swaps the whole backing store, then reloads every bit of in-memory state
// this app knows was cached from the DB (see UseBackupRestoreActionsReload's
// own doc comment on why: without it, stale state would silently overwrite
// the just-restored DB on the next save). Best-effort on the reload —
// a reload failure still leaves the restore itself successful.
const restoreFromFile = async (
    db: DataPort,
    file: File,
    reload: UseBackupRestoreActionsReload,
): Promise<void> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await db.importBackup(bytes);
    await Promise.all([reload.settings(), reload.ticketSchema()]).catch((err: unknown) => {
        console.error("Post-restore reload failed", err);
    });
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
export interface UseBackupRestoreActionsReload {
    /** `useSettings().reload` — re-reads the settings row after `importBackup` replaces the whole backing store. */
    settings: () => Promise<void>;
    /** `useSchema().reloadTicketSchema` — same, for the active ticket schema + saved-schema list. */
    ticketSchema: () => Promise<void>;
}

export const useBackupRestoreActions = (
    db: DataPort,
    reload: UseBackupRestoreActionsReload,
): UseBackupRestoreActions => {
    const [message, setMessage] = useState<FlashMessage | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmingRestore, setConfirmingRestore] = useState(false);
    const pendingFile = useRef<File | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Otherwise a restore (or export) flash that's still pending when the
    // Settings screen (or admin lock) unmounts this card fires `setMessage`
    // on an unmounted component — harmless today (React just warns) but a
    // leaked timer all the same.
    useEffect(() => {
        return () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
        };
    }, []);

    const showFlash = (text: string, bad = false): void => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setMessage({ text, bad });
        flashTimer.current = setTimeout(() => setMessage(null), FLASH_MS);
    };

    const handleExport = (): Promise<void> => runExport(db, setBusy, showFlash);

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
            await restoreFromFile(db, file, reload);
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
