import { describe, expect, it } from "vitest";

import { createDocMethods } from "./docs";
import { createMemoryState } from "./state";
import type { DocDraft } from "../../types";

const draft = (overrides: Partial<DocDraft> = {}): DocDraft => ({
    DocKind: "Ticket",
    ProfileId: "default",
    Body: {},
    ...overrides,
});

describe("resetDocSeries + allocateDocSeq — custom start number", () => {
    it("defaults to starting from 1 when no start number is given", async () => {
        const state = createMemoryState();
        const docs = createDocMethods(state);
        const saved = await docs.saveDoc(draft());
        const allocated = await docs.allocateDocSeq(saved.DocId);
        expect(allocated.DocSeq).toBe(1);
    });

    it("starts the new series from the chosen number after a reset", async () => {
        const state = createMemoryState();
        const docs = createDocMethods(state);

        const { Epoch } = await docs.resetDocSeries("Ticket", "default", 500);
        expect(Epoch).toBe(1);

        const saved = await docs.saveDoc(draft());
        expect(saved.SeriesEpoch).toBe(1);
        const allocated = await docs.allocateDocSeq(saved.DocId);
        expect(allocated.DocSeq).toBe(500);

        // The next ticket in the same (still-open) series keeps counting up
        // from the allocated max, not from the start number again.
        const second = await docs.saveDoc(draft());
        const allocatedSecond = await docs.allocateDocSeq(second.DocId);
        expect(allocatedSecond.DocSeq).toBe(501);
    });

    it("resets the start number back to 1 on a subsequent reset with no argument", async () => {
        const state = createMemoryState();
        const docs = createDocMethods(state);

        await docs.resetDocSeries("Ticket", "default", 500);
        await docs.resetDocSeries("Ticket", "default");

        const saved = await docs.saveDoc(draft());
        const allocated = await docs.allocateDocSeq(saved.DocId);
        expect(allocated.DocSeq).toBe(1);
    });
});
