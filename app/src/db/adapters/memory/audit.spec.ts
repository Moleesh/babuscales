import { describe, expect, it } from "vitest";

import { createAuditMethods } from "./audit";
import { createMemoryState } from "./state";
import type { AuditDraft } from "../../types";

const draft = (overrides: Partial<AuditDraft> = {}): AuditDraft => ({
    Actor: "admin",
    Action: "login",
    Body: {},
    ...overrides,
});

describe("memory audit adapter: appendAudit hash chain", () => {
    it("the first row's PrevHash is null", async () => {
        const audit = createAuditMethods(createMemoryState());
        const row = await audit.appendAudit(draft());
        expect(row.PrevHash).toBeNull();
        expect(row.RowHash).toBeTruthy();
    });

    it("each subsequent row's PrevHash equals the prior row's RowHash", async () => {
        const state = createMemoryState();
        const audit = createAuditMethods(state);
        const first = await audit.appendAudit(draft({ Action: "login" }));
        const second = await audit.appendAudit(draft({ Action: "logout" }));
        expect(second.PrevHash).toBe(first.RowHash);
        expect(second.RowHash).not.toBe(first.RowHash);
    });

    it("Target defaults to null when omitted", async () => {
        const audit = createAuditMethods(createMemoryState());
        const row = await audit.appendAudit(draft());
        expect(row.Target).toBeNull();
    });

    it("appends without reordering or removing prior entries", async () => {
        const state = createMemoryState();
        const audit = createAuditMethods(state);
        await audit.appendAudit(draft({ Action: "a" }));
        await audit.appendAudit(draft({ Action: "b" }));
        await audit.appendAudit(draft({ Action: "c" }));
        expect(state.audit.map((r) => r.Action)).toEqual(["a", "b", "c"]);
    });
});

describe("memory audit adapter: listAudit", () => {
    it("returns rows newest-first", async () => {
        const state = createMemoryState();
        const audit = createAuditMethods(state);
        await audit.appendAudit(draft({ Action: "a" }));
        await audit.appendAudit(draft({ Action: "b" }));
        const rows = await audit.listAudit();
        expect(rows.map((r) => r.Action)).toEqual(["b", "a"]);
    });

    it("filters by Target", async () => {
        const state = createMemoryState();
        const audit = createAuditMethods(state);
        await audit.appendAudit(draft({ Target: "t1" }));
        await audit.appendAudit(draft({ Target: "t2" }));
        const rows = await audit.listAudit({ Target: "t1" });
        expect(rows).toHaveLength(1);
        expect(rows[0]?.Target).toBe("t1");
    });

    it("Limit truncates the (already newest-first) result", async () => {
        const state = createMemoryState();
        const audit = createAuditMethods(state);
        await audit.appendAudit(draft({ Action: "a" }));
        await audit.appendAudit(draft({ Action: "b" }));
        await audit.appendAudit(draft({ Action: "c" }));
        const rows = await audit.listAudit({ Limit: 2 });
        expect(rows.map((r) => r.Action)).toEqual(["c", "b"]);
    });
});
