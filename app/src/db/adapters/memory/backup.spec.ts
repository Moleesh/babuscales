import { describe, expect, it } from "vitest";

import { createAssetMethods } from "./assets";
import { createBackupMethods } from "./backup";
import { createConfigMethods } from "./configs";
import { createDocMethods } from "./docs";
import { createMasterMethods } from "./masters";
import { createMemoryState } from "./state";

describe("memory backup adapter: export/import round trip", () => {
    it("round-trips docs, masters, configs and asset bytes through export -> import", async () => {
        const state = createMemoryState();
        const backup = createBackupMethods(state);
        const docs = createDocMethods(state);
        const masters = createMasterMethods(state);
        const configs = createConfigMethods(state);
        const assets = createAssetMethods(state);

        const savedDoc = await docs.saveDoc({ DocKind: "Ticket", ProfileId: "default", Body: { a: 1 } });
        const savedMaster = await masters.saveMaster({ MasterKind: "Party", Name: "Acme", Body: {} });
        const savedConfig = await configs.saveConfig({ ConfigKind: "Settings", Body: { x: 1 } });
        const assetMeta = await assets.putAsset({
            AssetKind: "Photo",
            MimeType: "image/jpeg",
            Bytes: new Uint8Array([10, 20, 30]),
        });

        const bytes = await backup.exportBackup();

        const target = createMemoryState();
        const targetBackup = createBackupMethods(target);
        await targetBackup.importBackup(bytes);

        expect(target.docs.get(savedDoc.DocId)?.Body).toEqual({ a: 1 });
        expect(target.masters.get(savedMaster.MasterId)?.Name).toBe("Acme");
        expect(target.configs.get(savedConfig.ConfigId)?.Body).toEqual({ x: 1 });
        expect(target.assets.get(assetMeta.AssetId)?.Bytes).toEqual(new Uint8Array([10, 20, 30]));
    });

    it("preserves SeriesEpoch and SeriesStart maps across the round trip", async () => {
        const state = createMemoryState();
        state.seriesEpoch.set("Ticket:default", 3);
        state.seriesStart.set("Ticket:default", 500);
        const backup = createBackupMethods(state);
        const bytes = await backup.exportBackup();

        const target = createMemoryState();
        await createBackupMethods(target).importBackup(bytes);
        expect(target.seriesEpoch.get("Ticket:default")).toBe(3);
        expect(target.seriesStart.get("Ticket:default")).toBe(500);
    });

    it("an older backup with no SeriesStart field still imports, defaulting to an empty map", async () => {
        const state = createMemoryState();
        const backup = createBackupMethods(state);
        const raw = JSON.parse(new TextDecoder().decode(await backup.exportBackup())) as Record<string, unknown>;
        delete raw.SeriesStart;
        const bytes = new TextEncoder().encode(JSON.stringify(raw));

        const target = createMemoryState();
        target.seriesStart.set("stale", 1); // pre-existing state should be replaced, not merged
        await createBackupMethods(target).importBackup(bytes);
        expect(target.seriesStart.size).toBe(0);
    });
});

describe("memory backup adapter: import validation", () => {
    it("rejects bytes that aren't valid JSON", () => {
        // importBackup throws synchronously (validation happens before any
        // Promise is returned) — assert via a throwing thunk, not .rejects.
        const backup = createBackupMethods(createMemoryState());
        const bytes = new TextEncoder().encode("not json{{{");
        expect(() => backup.importBackup(bytes)).toThrow(/not valid JSON/);
    });

    it("rejects a JSON payload with an unrecognized shape", () => {
        const backup = createBackupMethods(createMemoryState());
        const bytes = new TextEncoder().encode(JSON.stringify({ hello: "world" }));
        expect(() => backup.importBackup(bytes)).toThrow(/unrecognized shape/);
    });

    it("rejects a backup whose Version doesn't match this build's supported version", async () => {
        const state = createMemoryState();
        const backup = createBackupMethods(state);
        const raw = JSON.parse(new TextDecoder().decode(await backup.exportBackup())) as Record<string, unknown>;
        raw.Version = 99;
        const bytes = new TextEncoder().encode(JSON.stringify(raw));
        expect(() => backup.importBackup(bytes)).toThrow(/version 99/);
    });

    it("does not mutate state at all when validation fails", async () => {
        const state = createMemoryState();
        const docs = createDocMethods(state);
        await docs.saveDoc({ DocKind: "Ticket", ProfileId: "default", Body: {} });
        const backup = createBackupMethods(state);
        const bytes = new TextEncoder().encode("garbage");
        expect(() => backup.importBackup(bytes)).toThrow();
        expect(state.docs.size).toBe(1); // untouched
    });
});
