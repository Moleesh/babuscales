import { bytesFromWire, bytesToWire, invoke } from "./invoke";
import type { DataPort } from "../../DataPort";

type BackupMethods = Pick<DataPort, "exportBackup" | "importBackup">;

// PLAN §14 — unlike the memory adapter's ad hoc JSON snapshot, this is the
// real thing: `export_backup` (src-tauri/src/commands/backup.rs) hands back
// a `VACUUM INTO` SQLite file that has already been integrity-checked and
// checksummed on the Rust side.
export const createBackupMethods = (): BackupMethods => ({
    exportBackup: async () => bytesFromWire(await invoke<number[]>("export_backup")),

    importBackup: (bytes) => invoke<void>("import_backup", { bytes: bytesToWire(bytes) }),
});
