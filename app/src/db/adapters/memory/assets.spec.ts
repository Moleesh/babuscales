import { describe, expect, it } from "vitest";

import { createAssetMethods } from "./assets";
import { createMemoryState } from "./state";
import type { AssetDraft } from "../../types";

const draft = (overrides: Partial<AssetDraft> = {}): AssetDraft => ({
    AssetKind: "Photo",
    MimeType: "image/jpeg",
    Bytes: new Uint8Array([1, 2, 3, 4]),
    ...overrides,
});

describe("memory assets adapter: putAsset", () => {
    it("computes SizeBytes from the byte length and a real Sha256 hash", async () => {
        const assets = createAssetMethods(createMemoryState());
        const meta = await assets.putAsset(draft());
        expect(meta.SizeBytes).toBe(4);
        expect(meta.Sha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it("the returned metadata never carries a Bytes field", async () => {
        const assets = createAssetMethods(createMemoryState());
        const meta = await assets.putAsset(draft());
        expect(meta).not.toHaveProperty("Bytes");
    });

    it("Meta defaults to {} and OwnerId to null when omitted", async () => {
        const assets = createAssetMethods(createMemoryState());
        const meta = await assets.putAsset(draft());
        expect(meta.Meta).toEqual({});
        expect(meta.OwnerId).toBeNull();
    });

    it("identical bytes hash identically; different bytes hash differently", async () => {
        const assets = createAssetMethods(createMemoryState());
        const a = await assets.putAsset(draft({ Bytes: new Uint8Array([1, 2, 3]) }));
        const b = await assets.putAsset(draft({ Bytes: new Uint8Array([1, 2, 3]) }));
        const c = await assets.putAsset(draft({ Bytes: new Uint8Array([9, 9, 9]) }));
        expect(a.Sha256).toBe(b.Sha256);
        expect(a.Sha256).not.toBe(c.Sha256);
    });
});

describe("memory assets adapter: get/list", () => {
    it("getAssetMeta / getAssetBytes return null for an unknown id", async () => {
        const assets = createAssetMethods(createMemoryState());
        expect(await assets.getAssetMeta("nope")).toBeNull();
        expect(await assets.getAssetBytes("nope")).toBeNull();
    });

    it("getAssetBytes returns the raw bytes for a known asset", async () => {
        const assets = createAssetMethods(createMemoryState());
        const bytes = new Uint8Array([5, 6, 7]);
        const meta = await assets.putAsset(draft({ Bytes: bytes }));
        expect(await assets.getAssetBytes(meta.AssetId)).toEqual(bytes);
    });

    it("listAssetMeta filters by OwnerId and returns metadata only", async () => {
        const assets = createAssetMethods(createMemoryState());
        await assets.putAsset(draft({ OwnerId: "owner-1" }));
        await assets.putAsset(draft({ OwnerId: "owner-2" }));
        const rows = await assets.listAssetMeta("owner-1");
        expect(rows).toHaveLength(1);
        expect(rows[0]).not.toHaveProperty("Bytes");
    });
});
