// The TypeScript view of the fixed schema in PLAN §6.1. Field names are
// PascalCase (docs/CodingStandards.md — "PascalCase JSON keys, matching
// VaultBill"); the SQL columns behind them stay snake_case. Mapping between
// the two is the adapter's job, not the contract's.
//
// Deliberately thin: this mirrors table columns, not business shape. A
// ticket's Captures array, formula fields and masters search all belong to
// the field/formula/capture model in Phase 2 (PLAN §21) — DataPort only
// knows that `Body` is valid JSON, exactly like the `doc.body` column does.

/** Any JSON-serialisable value. What `json_valid(body)` actually guarantees. */
export type JsonRecord = Record<string, unknown>;

export type DocKind = "Ticket" | "Invoice";

export const MASTER_KINDS = [
    "Party",
    "Material",
    "Vehicle",
    "VehicleType",
    "Transporter",
    "Place",
    "Operator",
    "StoredTare",
] as const;
export type MasterKind = (typeof MASTER_KINDS)[number];

export const CONFIG_KINDS = [
    "Schema",
    "Layout",
    "Template",
    "Settings",
    "Format",
    "Preset",
    "Index",
    "LanguagePack",
    /** Per-tab/per-field guidance shown by the help control — PLAN §11. Editable without a release, travels with backups. */
    "Help",
] as const;
export type ConfigKind = (typeof CONFIG_KINDS)[number];

export const OUTBOX_STATES = ["Pending", "Sending", "Sent", "Failed"] as const;
export type OutboxState = (typeof OUTBOX_STATES)[number];

// --- Rows — what a read returns -------------------------------------------

export interface DocRow {
    DocId: string;
    DocKind: DocKind;
    ProfileId: string;
    SeriesEpoch: number;
    DocSeq: number | null;
    IsCancelled: boolean;
    Body: JsonRecord;
    CreatedAt: string;
    UpdatedAt: string;
    BodyHash: string;
}

export interface MasterRow {
    MasterId: string;
    MasterKind: MasterKind;
    Name: string;
    Body: JsonRecord;
    IsActive: boolean;
    UpdatedAt: string;
}

export interface ConfigRow {
    ConfigId: string;
    ConfigKind: ConfigKind;
    Body: JsonRecord;
    Version: number;
    UpdatedAt: string;
}

export interface AssetMetaRow {
    AssetId: string;
    AssetKind: string;
    OwnerId: string | null;
    MimeType: string;
    SizeBytes: number;
    Sha256: string;
    Meta: JsonRecord;
    CreatedAt: string;
}

export interface AssetRow extends AssetMetaRow {
    Bytes: Uint8Array;
}

export interface AuditRow {
    AuditId: string;
    At: string;
    Actor: string;
    Action: string;
    Target: string | null;
    Body: JsonRecord;
    RowHash: string;
    PrevHash: string | null;
}

export interface OutboxRow {
    OutboxId: string;
    Channel: string;
    Body: JsonRecord;
    Attempts: number;
    NextTryAt: string | null;
    State: OutboxState;
}

// --- Drafts — what a write accepts. Server/adapter fills the rest. --------

export interface DocDraft {
    DocId?: string;
    DocKind: DocKind;
    ProfileId?: string;
    IsCancelled?: boolean;
    Body: JsonRecord;
}

export interface MasterDraft {
    MasterId?: string;
    MasterKind: MasterKind;
    Name: string;
    Body: JsonRecord;
    IsActive?: boolean;
}

export interface ConfigDraft {
    ConfigId?: string;
    ConfigKind: ConfigKind;
    Body: JsonRecord;
    Version?: number;
}

export interface AssetDraft {
    AssetId?: string;
    AssetKind: string;
    OwnerId?: string | null;
    MimeType: string;
    Bytes: Uint8Array;
    Meta?: JsonRecord;
}

export interface AuditDraft {
    Actor: string;
    Action: string;
    Target?: string | null;
    Body: JsonRecord;
}

export interface OutboxDraft {
    Channel: string;
    Body: JsonRecord;
    NextTryAt?: string | null;
}

export interface OutboxPatch {
    Attempts?: number;
    NextTryAt?: string | null;
    State?: OutboxState;
}

// --- Queries — what a list/search accepts ----------------------------------

export interface DocQuery {
    DocKind?: DocKind;
    ProfileId?: string;
    IsCancelled?: boolean;
    CreatedFrom?: string;
    CreatedTo?: string;
    Limit?: number;
    Offset?: number;
}

export interface MasterQuery {
    MasterKind?: MasterKind;
    IsActive?: boolean;
    Search?: string;
    Limit?: number;
}

export interface ConfigQuery {
    ConfigKind?: ConfigKind;
}

export interface AuditQuery {
    Target?: string;
    From?: string;
    To?: string;
    Limit?: number;
}

export interface OutboxQuery {
    State?: OutboxState;
    Channel?: string;
}
