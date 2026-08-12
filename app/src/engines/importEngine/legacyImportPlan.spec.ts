import { describe, expect, it } from "vitest";

import type { LegacyImportBundle } from "./legacyImportBundle";
import { emptyExistingState, planLegacyImport, type LegacyExistingState } from "./legacyImportPlan";

const bundle = (overrides: Partial<LegacyImportBundle>): LegacyImportBundle => ({
    BundleVersion: 1,
    ...overrides,
});

describe("planLegacyImport: masters", () => {
    it("empty bundle produces no drafts and no skips", () => {
        const plan = planLegacyImport(bundle({}), emptyExistingState());
        expect(plan.masterDrafts).toEqual([]);
        expect(plan.ticketDrafts).toEqual([]);
        expect(plan.skipped).toEqual([]);
    });

    it("builds a Party draft with trimmed Name and optional fields", () => {
        const plan = planLegacyImport(
            bundle({ Parties: [{ Name: "  Acme  ", Email: "a@b.com", Phone: "123", Notes: "hi" }] }),
            emptyExistingState(),
        );
        expect(plan.masterDrafts).toEqual([
            {
                kind: "Party",
                draft: {
                    MasterKind: "Party",
                    Name: "Acme",
                    Body: { Notes: "hi", Email: "a@b.com", Phone: "123" },
                },
            },
        ]);
    });

    it("skips a master with a blank name", () => {
        const plan = planLegacyImport(bundle({ Vehicles: [{ Name: "   " }] }), emptyExistingState());
        expect(plan.masterDrafts).toEqual([]);
        expect(plan.skipped).toEqual([{ Kind: "Vehicle", Name: "   ", Reason: "Blank name" }]);
    });

    it("skips a master whose normalized name already exists (case/whitespace-insensitive)", () => {
        const existing: LegacyExistingState = {
            masterNamesByKind: { Vehicle: new Set(["tn01ab1234"]) },
            ticketLegacyIds: new Set(),
        };
        const plan = planLegacyImport(bundle({ Vehicles: [{ Name: " TN01AB1234 " }] }), existing);
        expect(plan.masterDrafts).toEqual([]);
        expect(plan.skipped).toEqual([
            { Kind: "Vehicle", Name: " TN01AB1234 ", Reason: "Already exists (matched by name)" },
        ]);
    });

    it("dedupes within the same bundle — two entries with the same name only import once", () => {
        const plan = planLegacyImport(
            bundle({ Operators: [{ Name: "Ravi" }, { Name: "ravi" }] }),
            emptyExistingState(),
        );
        expect(plan.masterDrafts).toHaveLength(1);
        expect(plan.skipped).toHaveLength(1);
        expect(plan.skipped[0]!.Reason).toBe("Already exists (matched by name)");
    });

    it("builds a Material draft carrying Rate through", () => {
        const plan = planLegacyImport(
            bundle({ Materials: [{ Name: "Sand", Rate: 55 }] }),
            emptyExistingState(),
        );
        expect(plan.masterDrafts[0]!.draft.Body).toEqual({ Notes: undefined, Rate: 55 });
    });

});

describe("planLegacyImport: masters (StoredTare + simple kinds)", () => {
    it("builds a StoredTare draft keyed by VehicleNo, not Name", () => {
        const plan = planLegacyImport(
            bundle({
                StoredTares: [{ VehicleNo: " TN01 ", WeightKg: 1200, CapturedAt: "2026-01-01", PartyName: " Acme " }],
            }),
            emptyExistingState(),
        );
        expect(plan.masterDrafts).toEqual([
            {
                kind: "StoredTare",
                draft: {
                    MasterKind: "StoredTare",
                    Name: "TN01",
                    Body: { WeightKg: 1200, CapturedAt: "2026-01-01", PartyName: "Acme" },
                },
            },
        ]);
    });

    it("skips a StoredTare with blank VehicleNo, with the vehicle-specific reason text", () => {
        const plan = planLegacyImport(
            bundle({ StoredTares: [{ VehicleNo: "  ", WeightKg: 100, CapturedAt: "x" }] }),
            emptyExistingState(),
        );
        expect(plan.skipped).toEqual([{ Kind: "StoredTare", Name: "  ", Reason: "Blank vehicle no" }]);
    });

    it("handles all five SIMPLE_KINDS bundle keys", () => {
        const plan = planLegacyImport(
            bundle({
                Vehicles: [{ Name: "V1" }],
                VehicleTypes: [{ Name: "T1" }],
                Transporters: [{ Name: "Tr1" }],
                Places: [{ Name: "P1" }],
                Operators: [{ Name: "O1" }],
            }),
            emptyExistingState(),
        );
        expect(plan.masterDrafts.map((d) => d.kind).sort()).toEqual(
            ["Operator", "Place", "Transporter", "Vehicle", "VehicleType"].sort(),
        );
    });
});

describe("planLegacyImport: tickets", () => {
    it("builds a ticket draft with a Tare capture only", () => {
        const plan = planLegacyImport(
            bundle({ Tickets: [{ LegacyId: "L1", TareKg: 1000, TareAt: "2026-01-01", Operator: "Ravi" }] }),
            emptyExistingState(),
        );
        expect(plan.ticketDrafts).toHaveLength(1);
        const draft = plan.ticketDrafts[0]!.draft;
        expect(draft.DocKind).toBe("Ticket");
        const body = draft.Body as { Captures: { Type: string; WeightKg: number }[] };
        expect(body.Captures).toHaveLength(1);
        expect(body.Captures[0]!.Type).toBe("Tare");
        expect(body.Captures[0]!.WeightKg).toBe(1000);
    });

    it("builds a ticket draft with both Tare and Gross captures, in that order", () => {
        const plan = planLegacyImport(
            bundle({ Tickets: [{ LegacyId: "L1", TareKg: 1000, GrossKg: 2500 }] }),
            emptyExistingState(),
        );
        const body = plan.ticketDrafts[0]!.draft.Body as { Captures: { Type: string }[] };
        expect(body.Captures.map((c) => c.Type)).toEqual(["Tare", "Gross"]);
    });

    it("defaults Operator to 'Legacy import' when absent/blank", () => {
        const plan = planLegacyImport(
            bundle({ Tickets: [{ LegacyId: "L1", TareKg: 1000, Operator: "  " }] }),
            emptyExistingState(),
        );
        const body = plan.ticketDrafts[0]!.draft.Body as { Captures: { Operator: string }[] };
        expect(body.Captures[0]!.Operator).toBe("Legacy import");
    });

    it("every generated capture has Source: Manual", () => {
        const plan = planLegacyImport(
            bundle({ Tickets: [{ LegacyId: "L1", TareKg: 1000, GrossKg: 2000 }] }),
            emptyExistingState(),
        );
        const body = plan.ticketDrafts[0]!.draft.Body as { Captures: { Source: string }[] };
        expect(body.Captures.every((c) => c.Source === "Manual")).toBe(true);
    });

});

describe("planLegacyImport: tickets (idempotency + edge cases)", () => {
    it("stamps ImportRef with the LegacyId for later idempotency", () => {
        const plan = planLegacyImport(
            bundle({ Tickets: [{ LegacyId: "L42", TareKg: 1000 }] }),
            emptyExistingState(),
        );
        const body = plan.ticketDrafts[0]!.draft.Body as { ImportRef: string };
        expect(body.ImportRef).toBe("L42");
    });

    it("skips a ticket with neither TareKg nor GrossKg", () => {
        const plan = planLegacyImport(bundle({ Tickets: [{ LegacyId: "L1" }] }), emptyExistingState());
        expect(plan.ticketDrafts).toEqual([]);
        expect(plan.skipped).toEqual([{ Kind: "Ticket", Name: "L1", Reason: "No weight on either side" }]);
    });

    it("skips a ticket whose LegacyId already exists (idempotent re-import)", () => {
        const existing: LegacyExistingState = {
            masterNamesByKind: {},
            ticketLegacyIds: new Set(["L1"]),
        };
        const plan = planLegacyImport(bundle({ Tickets: [{ LegacyId: "L1", TareKg: 1000 }] }), existing);
        expect(plan.ticketDrafts).toEqual([]);
        expect(plan.skipped).toEqual([
            { Kind: "Ticket", Name: "L1", Reason: "Already imported (matched by legacy id)" },
        ]);
    });

    it("dedupes two tickets in the same bundle sharing a LegacyId — only the first imports", () => {
        const plan = planLegacyImport(
            bundle({
                Tickets: [
                    { LegacyId: "L1", TareKg: 1000 },
                    { LegacyId: "L1", TareKg: 2000 },
                ],
            }),
            emptyExistingState(),
        );
        expect(plan.ticketDrafts).toHaveLength(1);
        expect(plan.skipped).toHaveLength(1);
    });

    it("a ticket with only GrossKg (no Tare) still imports, with a single Gross capture", () => {
        const plan = planLegacyImport(
            bundle({ Tickets: [{ LegacyId: "L1", GrossKg: 3000 }] }),
            emptyExistingState(),
        );
        const body = plan.ticketDrafts[0]!.draft.Body as { Captures: { Type: string }[] };
        expect(body.Captures).toEqual([expect.objectContaining({ Type: "Gross", WeightKg: 3000 })]);
    });
});

describe("emptyExistingState", () => {
    it("returns an empty masters map and an empty ticket id set", () => {
        const state = emptyExistingState();
        expect(state.masterNamesByKind).toEqual({});
        expect(state.ticketLegacyIds.size).toBe(0);
    });
});
