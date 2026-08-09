import type { MemoryState } from "./state";
import type { DataPort } from "../../DataPort";
import type {
    AssetMetaRow,
    AssetRow,
    AuditRow,
    ConfigRow,
    DocRow,
    JsonRecord,
    MasterRow,
    OutboxRow,
} from "../../types";

type BackupMethods = Pick<DataPort, "exportBackup" | "importBackup">;

// Real data must never exist without a way out of the file it lives in
// (PLAN §14) — the memory adapter answers that with one JSON snapshot,
// bytes included, so "download a backup" works identically in the
// database-less Pages demo as it will against SQLite.
const BACKUP_VERSION = 1;

const toBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
};

const fromBase64 = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

interface AssetSnapshot extends AssetMetaRow {
    BytesBase64: string;
}

export const createBackupMethods = (state: MemoryState): BackupMethods => ({
    exportBackup: () => {
        const snapshot: JsonRecord = {
            Version: BACKUP_VERSION,
            Docs: Array.from(state.docs.values()),
            Masters: Array.from(state.masters.values()),
            Configs: Array.from(state.configs.values()),
            Assets: Array.from(state.assets.values()).map((row): AssetSnapshot => ({
                AssetId: row.AssetId,
                AssetKind: row.AssetKind,
                OwnerId: row.OwnerId,
                MimeType: row.MimeType,
                SizeBytes: row.SizeBytes,
                Sha256: row.Sha256,
                Meta: row.Meta,
                CreatedAt: row.CreatedAt,
                BytesBase64: toBase64(row.Bytes),
            })),
            Audit: state.audit,
            Outbox: Array.from(state.outbox.values()),
            SeriesEpoch: Array.from(state.seriesEpoch.entries()),
        };
        return Promise.resolve(new TextEncoder().encode(JSON.stringify(snapshot)));
    },

    importBackup: (bytes) => {
        const snapshot = JSON.parse(new TextDecoder().decode(bytes)) as {
            Docs: DocRow[];
            Masters: MasterRow[];
            Configs: ConfigRow[];
            Assets: AssetSnapshot[];
            Audit: AuditRow[];
            Outbox: OutboxRow[];
            SeriesEpoch: [string, number][];
        };

        state.docs = new Map(snapshot.Docs.map((row) => [row.DocId, row]));
        state.masters = new Map(snapshot.Masters.map((row) => [row.MasterId, row]));
        state.configs = new Map(snapshot.Configs.map((row) => [row.ConfigId, row]));
        state.assets = new Map(
            snapshot.Assets.map((row): [string, AssetRow] => [
                row.AssetId,
                { ...row, Bytes: fromBase64(row.BytesBase64) },
            ]),
        );
        state.audit = snapshot.Audit;
        state.outbox = new Map(snapshot.Outbox.map((row) => [row.OutboxId, row]));
        state.seriesEpoch = new Map(snapshot.SeriesEpoch);
        return Promise.resolve();
    },
});
