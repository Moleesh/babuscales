import { bytesFromWire, bytesToWire, invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import { assetDraftSchema } from "../../schemas";
import type { AssetDraft, AssetMetaRow } from "../../types";

type AssetMethods = Pick<DataPort, "getAssetMeta" | "getAssetBytes" | "listAssetMeta" | "putAsset">;

// Zod at every boundary (docs/CodingStandards.md) — see
// tauri/configs.ts's own comment on this same pattern. Parsed before the
// `Bytes` wire conversion, since `assetDraftSchema` expects a real
// `Uint8Array`, not the wire-format `number[]`.
export const createAssetMethods = (): AssetMethods => ({
    getAssetMeta: (assetId) => invoke<AssetMetaRow | null>("get_asset_meta", { assetId }),

    getAssetBytes: async (assetId) => {
        const bytes = await invoke<number[] | null>("get_asset_bytes", { assetId });
        return bytes === null ? null : bytesFromWire(bytes);
    },

    listAssetMeta: (ownerId) => invoke<AssetMetaRow[]>("list_asset_meta", { ownerId }),

    putAsset: (draft: AssetDraft) => {
        const parsed = assetDraftSchema.parse(draft);
        return invoke<AssetMetaRow>("put_asset", {
            draft: { ...parsed, Bytes: bytesToWire(parsed.Bytes) },
        });
    },
});
