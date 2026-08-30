import { describe, expect, it } from "vitest";

import { createMasterMethods } from "./masters";
import { createMemoryState } from "./state";
import type { MasterDraft } from "../../types";

const draft = (overrides: Partial<MasterDraft> = {}): MasterDraft => ({
    MasterKind: "Party",
    Name: "Acme",
    Body: {},
    ...overrides,
});

describe("memory masters adapter: saveMaster", () => {
    it("creates a new row with a generated id when no MasterId is given, IsActive defaults true", async () => {
        const masters = createMasterMethods(createMemoryState());
        const row = await masters.saveMaster(draft());
        expect(row.MasterId).toBeTruthy();
        expect(row.IsActive).toBe(true);
    });

    it("updates the existing row in place when MasterId matches, preserving IsActive if not given", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        const created = await masters.saveMaster(draft({ IsActive: false }));
        const updated = await masters.saveMaster(draft({ MasterId: created.MasterId, Name: "Renamed" }));
        expect(updated.MasterId).toBe(created.MasterId);
        expect(updated.Name).toBe("Renamed");
        expect(updated.IsActive).toBe(false);
    });

    it("explicit IsActive overrides the preserved value", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        const created = await masters.saveMaster(draft({ IsActive: true }));
        const updated = await masters.saveMaster(draft({ MasterId: created.MasterId, IsActive: false }));
        expect(updated.IsActive).toBe(false);
    });
});

describe("memory masters adapter: getMaster / deleteMaster", () => {
    it("getMaster returns null for an unknown id", async () => {
        const masters = createMasterMethods(createMemoryState());
        expect(await masters.getMaster("nope")).toBeNull();
    });

    it("deleteMaster removes the row so a later getMaster returns null", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        const created = await masters.saveMaster(draft());
        await masters.deleteMaster(created.MasterId);
        expect(await masters.getMaster(created.MasterId)).toBeNull();
    });
});

describe("memory masters adapter: listMasters filtering", () => {
    it("filters by MasterKind", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        await masters.saveMaster(draft({ MasterKind: "Party", Name: "A" }));
        await masters.saveMaster(draft({ MasterKind: "Vehicle", Name: "B" }));
        const rows = await masters.listMasters({ MasterKind: "Party" });
        expect(rows.map((r) => r.Name)).toEqual(["A"]);
    });

    it("filters by IsActive", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        await masters.saveMaster(draft({ Name: "Active1", IsActive: true }));
        await masters.saveMaster(draft({ Name: "Inactive1", IsActive: false }));
        const rows = await masters.listMasters({ IsActive: true });
        expect(rows.map((r) => r.Name)).toEqual(["Active1"]);
    });

    it("filters by case-insensitive Search substring", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        await masters.saveMaster(draft({ Name: "Acme Traders" }));
        await masters.saveMaster(draft({ Name: "Beta Corp" }));
        const rows = await masters.listMasters({ Search: "acme" });
        expect(rows.map((r) => r.Name)).toEqual(["Acme Traders"]);
    });
});

describe("memory masters adapter: listMasters sort + keyset pagination", () => {
    it("sorts by Name case-insensitively, then by MasterId as a tiebreak", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        await masters.saveMaster(draft({ Name: "beta" }));
        await masters.saveMaster(draft({ Name: "Alpha" }));
        await masters.saveMaster(draft({ Name: "gamma" }));
        const rows = await masters.listMasters();
        expect(rows.map((r) => r.Name)).toEqual(["Alpha", "beta", "gamma"]);
    });

    it("Limit truncates the result", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        await masters.saveMaster(draft({ Name: "A" }));
        await masters.saveMaster(draft({ Name: "B" }));
        await masters.saveMaster(draft({ Name: "C" }));
        const rows = await masters.listMasters({ Limit: 2 });
        expect(rows).toHaveLength(2);
    });

    it("After cursors past the given (Name, MasterId), matching the sort order", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        const a = await masters.saveMaster(draft({ Name: "Alpha" }));
        await masters.saveMaster(draft({ Name: "Beta" }));
        await masters.saveMaster(draft({ Name: "Gamma" }));
        const rows = await masters.listMasters({ After: { Name: a.Name, MasterId: a.MasterId } });
        expect(rows.map((r) => r.Name)).toEqual(["Beta", "Gamma"]);
    });

    it("a same-Name tie breaks the cursor on MasterId", async () => {
        const state = createMemoryState();
        const masters = createMasterMethods(state);
        const first = await masters.saveMaster(draft({ Name: "Same" }));
        const second = await masters.saveMaster(draft({ Name: "Same" }));
        const [lower, higher] = [first, second].sort((x, y) => x.MasterId.localeCompare(y.MasterId));
        const rows = await masters.listMasters({ After: { Name: lower!.Name, MasterId: lower!.MasterId } });
        expect(rows.map((r) => r.MasterId)).toEqual([higher!.MasterId]);
    });
});
