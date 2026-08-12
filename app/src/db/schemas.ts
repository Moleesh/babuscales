import { z } from "zod";

import { CONFIG_KINDS, MASTER_KINDS, OUTBOX_STATES } from "./types";

// Zod at every boundary (docs/CodingStandards.md). DataPort is the boundary
// between the UI and storage — a draft is untrusted the moment it leaves a
// form, so it is parsed here once rather than trusted by every adapter.
export const jsonRecordSchema: z.ZodType<Record<string, unknown>> = z.record(
    z.string(),
    z.unknown(),
);

export const docKindSchema = z.enum(["Ticket", "Invoice"]);
export const masterKindSchema = z.enum(MASTER_KINDS);
export const configKindSchema = z.enum(CONFIG_KINDS);
export const outboxStateSchema = z.enum(OUTBOX_STATES);

export const docDraftSchema = z.object({
    DocId: z.string().min(1).optional(),
    DocKind: docKindSchema,
    ProfileId: z.string().min(1).optional(),
    IsCancelled: z.boolean().optional(),
    Body: jsonRecordSchema,
});

export const masterDraftSchema = z.object({
    MasterId: z.string().min(1).optional(),
    MasterKind: masterKindSchema,
    Name: z.string().min(1),
    Body: jsonRecordSchema,
    IsActive: z.boolean().optional(),
});

export const configDraftSchema = z.object({
    ConfigId: z.string().min(1).optional(),
    ConfigKind: configKindSchema,
    Body: jsonRecordSchema,
    Version: z.number().int().positive().optional(),
});

export const assetDraftSchema = z.object({
    AssetId: z.string().min(1).optional(),
    AssetKind: z.string().min(1),
    OwnerId: z.string().min(1).nullable().optional(),
    MimeType: z.string().min(1),
    Bytes: z.instanceof(Uint8Array),
    Meta: jsonRecordSchema.optional(),
});

export const auditDraftSchema = z.object({
    Actor: z.string().min(1),
    Action: z.string().min(1),
    Target: z.string().min(1).nullable().optional(),
    Body: jsonRecordSchema,
});

export const outboxDraftSchema = z.object({
    Channel: z.string().min(1),
    Body: jsonRecordSchema,
    NextTryAt: z.string().min(1).nullable().optional(),
});

export const outboxPatchSchema = z.object({
    Attempts: z.number().int().nonnegative().optional(),
    NextTryAt: z.string().min(1).nullable().optional(),
    State: outboxStateSchema.optional(),
});
