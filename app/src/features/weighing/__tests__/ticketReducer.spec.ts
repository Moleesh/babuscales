import { describe, expect, it } from "vitest";

import type { Capture } from "@db/ticketBody";
import type { DocRow } from "@db/types";

import { initialTicketState, ticketReducer } from "../useWeighingTicket";

const makeCapture = (overrides: Partial<Capture> = {}): Capture => ({
    CaptureId: "cap-1",
    Type: "Tare",
    WeightKg: 1000,
    At: "2026-08-20T00:00:00.000Z",
    Operator: "op1",
    Source: "Indicator",
    Images: [],
    ...overrides,
});

const makeDoc = (overrides: Partial<DocRow> = {}): DocRow => ({
    DocId: "doc-1",
    DocKind: "Ticket",
    ProfileId: "default",
    SeriesEpoch: 0,
    DocSeq: 42,
    IsCancelled: false,
    Body: { BodyVersion: 1, Captures: [] },
    CreatedAt: "2026-08-20T00:00:00.000Z",
    UpdatedAt: "2026-08-20T00:00:00.000Z",
    BodyHash: "hash",
    ...overrides,
});

describe("ticketReducer", () => {
    // "Forces exactly one Save (or Save & Park) between any two captures" —
    // AddCapture's own doc comment. A second capture attempted before that
    // save lands should never reach the reducer as an "allowed" transition
    // in the first place (useTicketCapture gates on `awaitingSave`), but the
    // reducer's own job here is just to actually raise that flag and blank
    // `kind` so the Tare/Gross toggle can't be driven again until it clears.
    it("AddCapture sets awaitingSave and resets kind to null (save-between-captures gate)", () => {
        const state = initialTicketState();
        const capture = makeCapture();
        const next = ticketReducer(state, { type: "AddCapture", capture });

        expect(next.captures).toEqual([capture]);
        expect(next.awaitingSave).toBe(true);
        expect(next.kind).toBeNull();
    });

    it("Saved clears awaitingSave without touching captures", () => {
        const afterCapture = ticketReducer(initialTicketState(), {
            type: "AddCapture",
            capture: makeCapture(),
        });
        const saved = ticketReducer(afterCapture, {
            type: "Saved",
            docId: "doc-1",
            docSeq: 7,
            ticketDateIso: "2024-01-01T00:00:00.000Z",
        });

        expect(saved.awaitingSave).toBe(false);
        expect(saved.docId).toBe("doc-1");
        expect(saved.docSeq).toBe(7);
        expect(saved.captures).toEqual(afterCapture.captures);
    });

    it("Resumed rebuilds state from a one-capture (open) doc as unlocked and armed for the missing side", () => {
        const tare = makeCapture({ Type: "Tare" });
        const doc = makeDoc({ Body: { BodyVersion: 1, Captures: [tare] } });
        const next = ticketReducer(initialTicketState(), { type: "Resumed", doc });

        expect(next.docId).toBe("doc-1");
        expect(next.docSeq).toBe(42);
        expect(next.captures).toEqual([tare]);
        // Only a Tare is in — still open, and armed for Gross next.
        expect(next.isLocked).toBe(false);
        expect(next.kind).toBe("Gross");
        expect(next.awaitingSave).toBe(false);
    });

    it("Resumed rebuilds state from a two-capture (completed) doc as locked", () => {
        const tare = makeCapture({ Type: "Tare" });
        const gross = makeCapture({ CaptureId: "cap-2", Type: "Gross", WeightKg: 5000 });
        const doc = makeDoc({ Body: { BodyVersion: 1, Captures: [tare, gross] } });
        const next = ticketReducer(initialTicketState(), { type: "Resumed", doc });

        // Mirrors save()'s own rule — a resumed ticket with both captures
        // already in was already locked when it was saved, and must come
        // back locked rather than editable.
        expect(next.isLocked).toBe(true);
        expect(next.captures).toEqual([tare, gross]);
    });

    it("Resumed carries over the doc's own PrintCount, defaulting to 0 when absent", () => {
        const withCount = ticketReducer(initialTicketState(), {
            type: "Resumed",
            doc: makeDoc({ Body: { BodyVersion: 1, Captures: [], PrintCount: 3 } }),
        });
        const withoutCount = ticketReducer(initialTicketState(), {
            type: "Resumed",
            doc: makeDoc({ Body: { BodyVersion: 1, Captures: [] } }),
        });

        expect(withCount.printCount).toBe(3);
        expect(withoutCount.printCount).toBe(0);
    });

    it("ResetToNew returns a fresh initial state regardless of prior state", () => {
        const dirty = ticketReducer(initialTicketState(), { type: "AddCapture", capture: makeCapture() });
        expect(ticketReducer(dirty, { type: "ResetToNew" })).toEqual(initialTicketState());
    });
});
