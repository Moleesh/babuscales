import type { MemoryState } from "./state";
import { nowIso } from "./state";
import type { DataPort } from "../../DataPort";
import { sha256Hex } from "../../hash";
import { newId } from "../../id";
import { assetDraftSchema } from "../../schemas";
import type { AssetDraft, AssetMetaRow, AssetRow } from "../../types";

type AssetMethods = Pick<DataPort, "getAssetMeta" | "getAssetBytes" | "listAssetMeta" | "putAsset">;

// Metadata only — never the bytes. Mirrors the rule on the `asset` table
// itself: a listing must not silently drag every image through memory.
// Built field-by-field rather than spread-and-omit so `Bytes` is never even
// briefly bound to a local.
const toMeta = (row: AssetRow): AssetMetaRow => ({
    AssetId: row.AssetId,
    AssetKind: row.AssetKind,
    OwnerId: row.OwnerId,
    MimeType: row.MimeType,
    SizeBytes: row.SizeBytes,
    Sha256: row.Sha256,
    Meta: row.Meta,
    CreatedAt: row.CreatedAt,
});

export const createAssetMethods = (state: MemoryState): AssetMethods => ({
    getAssetMeta: (assetId) => {
        const row = state.assets.get(assetId);
        return Promise.resolve(row ? toMeta(row) : null);
    },

    getAssetBytes: (assetId) => {
        const row = state.assets.get(assetId);
        return Promise.resolve(row ? row.Bytes : null);
    },

    listAssetMeta: (ownerId) => {
        const rows = Array.from(state.assets.values())
            .filter((row) => row.OwnerId === ownerId)
            .map(toMeta);
        return Promise.resolve(rows);
    },

    putAsset: async (draft: AssetDraft) => {
        const parsed = assetDraftSchema.parse(draft);
        const row: AssetRow = {
            AssetId: parsed.AssetId ?? newId(),
            AssetKind: parsed.AssetKind,
            OwnerId: parsed.OwnerId ?? null,
            MimeType: parsed.MimeType,
            Bytes: parsed.Bytes,
            SizeBytes: parsed.Bytes.byteLength,
            Sha256: await sha256Hex(parsed.Bytes),
            Meta: parsed.Meta ?? {},
            CreatedAt: nowIso(),
        };
        state.assets.set(row.AssetId, row);
        return toMeta(row);
    },
});
