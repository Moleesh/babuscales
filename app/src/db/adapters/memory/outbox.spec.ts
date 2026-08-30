import { describe, expect, it } from "vitest";

import { createOutboxMethods } from "./outbox";
import { createMemoryState } from "./state";
import type { OutboxDraft } from "../../types";

const draft = (overrides: Partial<OutboxDraft> = {}): OutboxDraft => ({
    Channel: "Email",
    Body: {},
    ...overrides,
});

describe("memory outbox adapter: enqueueOutbox", () => {
    it("starts a new row Pending with Attempts 0", async () => {
        const outbox = createOutboxMethods(createMemoryState());
        const row = await outbox.enqueueOutbox(draft());
        expect(row.State).toBe("Pending");
        expect(row.Attempts).toBe(0);
        expect(row.NextTryAt).toBeNull();
    });

    it("carries NextTryAt through when given", async () => {
        const outbox = createOutboxMethods(createMemoryState());
        const row = await outbox.enqueueOutbox(draft({ NextTryAt: "2026-01-01T00:00:00.000Z" }));
        expect(row.NextTryAt).toBe("2026-01-01T00:00:00.000Z");
    });
});

describe("memory outbox adapter: updateOutbox", () => {
    it("rejects for an unknown OutboxId", async () => {
        const outbox = createOutboxMethods(createMemoryState());
        await expect(outbox.updateOutbox("nope", {})).rejects.toThrow();
    });

    it("patches only the given fields, leaving the rest unchanged", async () => {
        const state = createMemoryState();
        const outbox = createOutboxMethods(state);
        const row = await outbox.enqueueOutbox(draft());
        const updated = await outbox.updateOutbox(row.OutboxId, { Attempts: 2 });
        expect(updated.Attempts).toBe(2);
        expect(updated.State).toBe("Pending");
    });

    it("an explicit null NextTryAt clears it (distinct from omitting the field)", async () => {
        const state = createMemoryState();
        const outbox = createOutboxMethods(state);
        const row = await outbox.enqueueOutbox(draft({ NextTryAt: "2026-01-01T00:00:00.000Z" }));
        const updated = await outbox.updateOutbox(row.OutboxId, { NextTryAt: null });
        expect(updated.NextTryAt).toBeNull();
    });

    it("omitting NextTryAt in the patch leaves the existing value untouched", async () => {
        const state = createMemoryState();
        const outbox = createOutboxMethods(state);
        const row = await outbox.enqueueOutbox(draft({ NextTryAt: "2026-01-01T00:00:00.000Z" }));
        const updated = await outbox.updateOutbox(row.OutboxId, { Attempts: 1 });
        expect(updated.NextTryAt).toBe("2026-01-01T00:00:00.000Z");
    });
});

describe("memory outbox adapter: listOutbox filtering", () => {
    it("filters by State and Channel", async () => {
        const state = createMemoryState();
        const outbox = createOutboxMethods(state);
        const a = await outbox.enqueueOutbox(draft({ Channel: "Email" }));
        await outbox.enqueueOutbox(draft({ Channel: "Sms" }));
        await outbox.updateOutbox(a.OutboxId, { State: "Failed" });
        expect((await outbox.listOutbox({ Channel: "Email" })).map((r) => r.Channel)).toEqual(["Email"]);
        expect((await outbox.listOutbox({ State: "Failed" })).map((r) => r.OutboxId)).toEqual([a.OutboxId]);
    });
});
