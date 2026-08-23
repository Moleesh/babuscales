import { z } from "zod";

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
// — the memory adapter answers that with one JSON snapshot,
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

// Loose on purpose — this only needs to catch "not a backup file at all" /
// "shape from a future version this build doesn't understand" before any
// state mutation happens; the row-level shapes (DocRow, MasterRow, ...)
// already get their own validation on the way back through the normal
// read paths, same division of labor as schemaJson.ts's schema validation
// vs. the app trusting `Schema` afterwards.
const jsonRecordSchema = z.record(z.string(), z.unknown());
const backupSnapshotSchema = z.object({
    Version: z.number(),
    Docs: z.array(jsonRecordSchema),
    Masters: z.array(jsonRecordSchema),
    Configs: z.array(jsonRecordSchema),
    Assets: z.array(jsonRecordSchema.and(z.object({ AssetId: z.string(), BytesBase64: z.string() }))),
    Audit: z.array(jsonRecordSchema),
    Outbox: z.array(jsonRecordSchema),
    SeriesEpoch: z.array(z.tuple([z.string(), z.number()])),
    // Optional/defaulted, not required — older Version-1 backups exported
    // before this field existed still round-trip through import instead of
    // failing validation outright; they just come back with no saved
    // sequence-start overrides (the same "falls back to 1" behavior
    // docs.ts already has for a key with no entry at all).
    SeriesStart: z.array(z.tuple([z.string(), z.number()])).optional().default([]),
});

type BackupSnapshot = {
    Version: number;
    Docs: DocRow[];
    Masters: MasterRow[];
    Configs: ConfigRow[];
    Assets: AssetSnapshot[];
    Audit: AuditRow[];
    Outbox: OutboxRow[];
    SeriesEpoch: [string, number][];
    SeriesStart: [string, number][];
};

/** Parses + validates a backup file's bytes before anything is allowed to touch `state` — throws a clear, actionable error on invalid JSON, an unrecognized shape, or a `Version` this build doesn't understand, instead of a confusing crash or silent garbage-in. */
const parseBackupSnapshot = (bytes: Uint8Array): BackupSnapshot => {
    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(new TextDecoder().decode(bytes));
    } catch (err) {
        throw new Error("Backup file is not valid JSON.", { cause: err });
    }

    const result = backupSnapshotSchema.safeParse(parsedJson);
    if (!result.success) {
        throw new Error(
            `Backup file has an unrecognized shape and cannot be imported: ${result.error.message}`,
        );
    }
    const snapshot = result.data as unknown as BackupSnapshot;

    if (snapshot.Version !== BACKUP_VERSION) {
        throw new Error(
            `Backup file is version ${snapshot.Version}, but this app supports version ${BACKUP_VERSION}. Import cancelled.`,
        );
    }
    return snapshot;
};

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
            SeriesStart: Array.from(state.seriesStart.entries()),
        };
        return Promise.resolve(new TextEncoder().encode(JSON.stringify(snapshot)));
    },

    importBackup: (bytes) => {
        const snapshot = parseBackupSnapshot(bytes);

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
        state.seriesStart = new Map(snapshot.SeriesStart);
        return Promise.resolve();
    },
});
