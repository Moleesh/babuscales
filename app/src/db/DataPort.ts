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
// Deliberately storage-shaped, not business-shaped: it mirrors the
// tables. A ticket's Captures array, formula fields and masters search are
// a later phase — they read and write `Body` through this same
// interface without DataPort ever knowing what is inside it.
export interface DataPort {
    // doc — every ticket and invoice
    getDoc(docId: string): Promise<DocRow | null>;
    listDocs(query?: DocQuery): Promise<DocRow[]>;
    saveDoc(draft: DocDraft): Promise<DocRow>;
    /** Assigns the next `doc_seq` in (DocKind, ProfileId, current SeriesEpoch). Idempotent — a doc that already has a number is returned unchanged. Called at close, never at draft. */
    allocateDocSeq(docId: string): Promise<DocRow>;
    /** Bumps the numbering epoch so the next allocation restarts from `startSeq` (default 1). Manual by default (PLAN round 4B) — nothing calls this on a schedule unless configured to. */
    resetDocSeries(docKind: DocKind, profileId: string, startSeq?: number): Promise<{ Epoch: number }>;

    // master — reference data
    getMaster(masterId: string): Promise<MasterRow | null>;
    /** Sorted `name COLLATE NOCASE ASC`. Pass `query.After` (the last row's `Name`+`MasterId` from a previous call) to keyset-paginate past it instead of always returning page 1 — `MastersScreen`'s "Load more" is the one caller today; every other consumer (`useMasterCache`) omits it and gets the same full, unpaginated result as before. */
    listMasters(query?: MasterQuery): Promise<MasterRow[]>;
    saveMaster(draft: MasterDraft): Promise<MasterRow>;

    // config — schemas, layouts, templates, settings, formats, presets
    getConfig(configId: string): Promise<ConfigRow | null>;
    listConfig(query?: ConfigQuery): Promise<ConfigRow[]>;
    saveConfig(draft: ConfigDraft): Promise<ConfigRow>;

    // asset — all binary content. Metadata and bytes are fetched separately
    // on purpose: `SELECT *` on this table would materialise every image
    // — never done implicitly here.
    getAssetMeta(assetId: string): Promise<AssetMetaRow | null>;
    getAssetBytes(assetId: string): Promise<Uint8Array | null>;
    listAssetMeta(ownerId: string): Promise<AssetMetaRow[]>;
    putAsset(draft: AssetDraft): Promise<AssetMetaRow>;

    // audit — hash-chained, append-only
    appendAudit(draft: AuditDraft): Promise<AuditRow>;
    listAudit(query?: AuditQuery): Promise<AuditRow[]>;

    // outbox — durable queue for anything leaving the machine
    enqueueOutbox(draft: OutboxDraft): Promise<OutboxRow>;
    listOutbox(query?: OutboxQuery): Promise<OutboxRow[]>;
    updateOutbox(outboxId: string, patch: OutboxPatch): Promise<OutboxRow>;

    // backup — real data must never exist without a way out of
    // the file it lives in; every adapter answers this from day one.
    exportBackup(): Promise<Uint8Array>;
    importBackup(bytes: Uint8Array): Promise<void>;
}
