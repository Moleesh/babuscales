import { describe, expect, it } from "vitest";

import { createConfigMethods } from "./configs";
import { createMemoryState } from "./state";
import type { ConfigDraft } from "../../types";

const draft = (overrides: Partial<ConfigDraft> = {}): ConfigDraft => ({
    ConfigKind: "Settings",
    Body: {},
    ...overrides,
});

describe("memory configs adapter: saveConfig versioning", () => {
    it("a brand-new row (no ConfigId) starts at Version 1 when no Version is given", async () => {
        const configs = createConfigMethods(createMemoryState());
        const row = await configs.saveConfig(draft());
        expect(row.Version).toBe(1);
        expect(row.ConfigId).toBeTruthy();
    });

    it("saving over an existing row without an explicit Version auto-increments by 1", async () => {
        const state = createMemoryState();
        const configs = createConfigMethods(state);
        const first = await configs.saveConfig(draft());
        const second = await configs.saveConfig(draft({ ConfigId: first.ConfigId }));
        expect(second.Version).toBe(2);
    });

    it("an explicit Version overrides the auto-increment", async () => {
        const state = createMemoryState();
        const configs = createConfigMethods(state);
        const first = await configs.saveConfig(draft());
        const second = await configs.saveConfig(draft({ ConfigId: first.ConfigId, Version: 99 }));
        expect(second.Version).toBe(99);
    });
});

describe("memory configs adapter: get/list/delete", () => {
    it("getConfig returns null for an unknown id", async () => {
        const configs = createConfigMethods(createMemoryState());
        expect(await configs.getConfig("nope")).toBeNull();
    });

    it("listConfig filters by ConfigKind when given, else returns everything", async () => {
        const state = createMemoryState();
        const configs = createConfigMethods(state);
        await configs.saveConfig(draft({ ConfigKind: "Settings" }));
        await configs.saveConfig(draft({ ConfigKind: "Schema" as ConfigDraft["ConfigKind"] }));
        expect(await configs.listConfig({ ConfigKind: "Settings" })).toHaveLength(1);
        expect(await configs.listConfig()).toHaveLength(2);
    });

    it("deleteConfig removes the row", async () => {
        const state = createMemoryState();
        const configs = createConfigMethods(state);
        const row = await configs.saveConfig(draft());
        await configs.deleteConfig(row.ConfigId);
        expect(await configs.getConfig(row.ConfigId)).toBeNull();
    });
});
