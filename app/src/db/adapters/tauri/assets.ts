import { bytesFromWire, bytesToWire, invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import type { AssetDraft, AssetMetaRow } from "../../types";

type AssetMethods = Pick<DataPort, "getAssetMeta" | "getAssetBytes" | "listAssetMeta" | "putAsset">;

export const createAssetMethods = (): AssetMethods => ({
    getAssetMeta: (assetId) => invoke<AssetMetaRow | null>("get_asset_meta", { assetId }),

    getAssetBytes: async (assetId) => {
        const bytes = await invoke<number[] | null>("get_asset_bytes", { assetId });
        return bytes === null ? null : bytesFromWire(bytes);
    },

    listAssetMeta: (ownerId) => invoke<AssetMetaRow[]>("list_asset_meta", { ownerId }),

    putAsset: (draft: AssetDraft) =>
        invoke<AssetMetaRow>("put_asset", { draft: { ...draft, Bytes: bytesToWire(draft.Bytes) } }),
});
