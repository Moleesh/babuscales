import type {
    AssetDraft,
    AssetMetaRow,
    AuditDraft,
    AuditQuery,
    AuditRow,
    ConfigDraft,
    ConfigQuery,
    ConfigRow,
    DocDraft,
    DocKind,
    DocQuery,
    DocRow,
    MasterDraft,
    MasterQuery,
    MasterRow,
    OutboxDraft,
    OutboxPatch,
    OutboxQuery,
    OutboxRow,
} from "./types";

// The one contract. Tauri (SQLite), memory and, later, HTTP each implement
// this exact shape (app/README.md). Nothing above this layer — no
// component, no engine — imports an adapter directly; everything goes
// through a DataPort instance so swapping the adapter is the only thing
// that changes between the desktop build and the database-less Pages demo.
//
// Deliberately storage-shaped, not business-shaped: it mirrors PLAN §6.1's
// tables. A ticket's Captures array, formula fields and masters search are
// Phase 2 (PLAN §21) — they read and write `Body` through this same
// interface without DataPort ever knowing what is inside it.
export interface DataPort {
    // doc — every ticket and invoice (PLAN §6.1)
    getDoc(docId: string): Promise<DocRow | null>;
    listDocs(query?: DocQuery): Promise<DocRow[]>;
    saveDoc(draft: DocDraft): Promise<DocRow>;
    /** Assigns the next `doc_seq` in (DocKind, ProfileId, current SeriesEpoch). Idempotent — a doc that already has a number is returned unchanged. Called at close, never at draft (PLAN §6.1). */
    allocateDocSeq(docId: string): Promise<DocRow>;
    /** Bumps the numbering epoch so the next allocation restarts from 1. Manual by default (PLAN round 4B) — nothing calls this on a schedule unless configured to. */
    resetDocSeries(docKind: DocKind, profileId: string): Promise<{ Epoch: number }>;

    // master — reference data (PLAN §6.1, §9)
    getMaster(masterId: string): Promise<MasterRow | null>;
    listMasters(query?: MasterQuery): Promise<MasterRow[]>;
    saveMaster(draft: MasterDraft): Promise<MasterRow>;

    // config — schemas, layouts, templates, settings, formats, presets, indexes
    getConfig(configId: string): Promise<ConfigRow | null>;
    listConfig(query?: ConfigQuery): Promise<ConfigRow[]>;
    saveConfig(draft: ConfigDraft): Promise<ConfigRow>;

    // asset — all binary content. Metadata and bytes are fetched separately
    // on purpose: `SELECT *` on this table would materialise every image
    // (PLAN §6.1's comment on `doc`/`asset` — never done implicitly here).
    getAssetMeta(assetId: string): Promise<AssetMetaRow | null>;
    getAssetBytes(assetId: string): Promise<Uint8Array | null>;
    listAssetMeta(ownerId: string): Promise<AssetMetaRow[]>;
    putAsset(draft: AssetDraft): Promise<AssetMetaRow>;

    // audit — hash-chained, append-only
    appendAudit(draft: AuditDraft): Promise<AuditRow>;
    listAudit(query?: AuditQuery): Promise<AuditRow[]>;

    // outbox — durable queue for anything leaving the machine (PLAN §18)
    enqueueOutbox(draft: OutboxDraft): Promise<OutboxRow>;
    listOutbox(query?: OutboxQuery): Promise<OutboxRow[]>;
    updateOutbox(outboxId: string, patch: OutboxPatch): Promise<OutboxRow>;

    // backup — PLAN §14. Real data must never exist without a way out of
    // the file it lives in; every adapter answers this from day one.
    exportBackup(): Promise<Uint8Array>;
    importBackup(bytes: Uint8Array): Promise<void>;
}
