import { describe, expect, it, vi } from "vitest";

import type { DataPort } from "@db/DataPort";
import type { DocDraft, DocRow, MasterDraft, MasterRow } from "@db/types";
import type { LegacyImportPlan } from "@engines/importEngine/legacyImportPlan";

import { commitLegacyImport, loadExistingState } from "./legacyImportRun";

const masterRow = (name: string): MasterRow => ({
    MasterId: name,
    MasterKind: "Party",
    Name: name,
    Body: {},
    IsActive: true,
    UpdatedAt: "2026-01-01T00:00:00.000Z",
});

const docRow = (importRef?: string): DocRow => ({
    DocId: "d1",
    DocKind: "Ticket",
    ProfileId: "default",
    SeriesEpoch: 1,
    DocSeq: 1,
    IsCancelled: false,
    Body: importRef !== undefined ? { ImportRef: importRef } : {},
    CreatedAt: "2026-01-01T00:00:00.000Z",
    UpdatedAt: "2026-01-01T00:00:00.000Z",
    BodyHash: "h",
});

describe("loadExistingState", () => {
    it("builds a trimmed/lowercased name set per master kind and a legacy-id set from tickets", async () => {
        const db = {
            listMasters: vi.fn(async ({ MasterKind }: { MasterKind: string }) =>
                MasterKind === "Party" ? [masterRow("  Acme Co  ")] : [],
            ),
            listDocs: vi.fn(async () => [docRow("LEG-1"), docRow(undefined), docRow("LEG-2")]),
        } as unknown as DataPort;

        const state = await loadExistingState(db);
        expect(state.masterNamesByKind.Party?.has("acme co")).toBe(true);
        expect(state.ticketLegacyIds).toEqual(new Set(["LEG-1", "LEG-2"]));
    });

    it("ignores a non-string ImportRef rather than including it", async () => {
        const db = {
            listMasters: vi.fn(async () => []),
            listDocs: vi.fn(async () => [{ ...docRow(), Body: { ImportRef: 123 } }]),
        } as unknown as DataPort;
        const state = await loadExistingState(db);
        expect(state.ticketLegacyIds.size).toBe(0);
    });
});

describe("commitLegacyImport", () => {
    const plan = (masterDrafts: { kind: string; draft: MasterDraft }[], ticketDrafts: { legacyId: string; draft: DocDraft }[]) =>
        ({ masterDrafts, ticketDrafts, skipped: [] }) as unknown as LegacyImportPlan;

    it("commits all masters then all tickets, counting each success", async () => {
        const saveMaster = vi.fn(async (d: MasterDraft) => masterRow(d.Name));
        const saveDoc = vi.fn(async () => docRow());
        const db = { saveMaster, saveDoc } as unknown as DataPort;

        const result = await commitLegacyImport(
            db,
            plan(
                [
                    { kind: "Party", draft: { MasterKind: "Party", Name: "A", Body: {} } },
                    { kind: "Party", draft: { MasterKind: "Party", Name: "B", Body: {} } },
                ],
                [{ legacyId: "L1", draft: { DocKind: "Ticket", Body: {} } }],
            ),
        );
        expect(result).toEqual({ masterCreated: 2, ticketCreated: 1, failed: [] });
        expect(saveMaster).toHaveBeenCalledTimes(2);
        expect(saveDoc).toHaveBeenCalledTimes(1);
    });

    it("continues past a failed master/ticket save, recording label + message", async () => {
        const saveMaster = vi
            .fn()
            .mockRejectedValueOnce(new Error("dup name"))
            .mockResolvedValueOnce(masterRow("B"));
        const saveDoc = vi.fn().mockRejectedValueOnce(new Error("bad body"));
        const db = { saveMaster, saveDoc } as unknown as DataPort;

        const result = await commitLegacyImport(
            db,
            plan(
                [
                    { kind: "Party", draft: { MasterKind: "Party", Name: "A", Body: {} } },
                    { kind: "Party", draft: { MasterKind: "Party", Name: "B", Body: {} } },
                ],
                [{ legacyId: "L1", draft: { DocKind: "Ticket", Body: {} } }],
            ),
        );
        expect(result.masterCreated).toBe(1);
        expect(result.ticketCreated).toBe(0);
        expect(result.failed).toEqual([
            { label: 'Party "A"', message: "dup name" },
            { label: "Ticket L1", message: "bad body" },
        ]);
    });

    it("stringifies a non-Error rejection rather than throwing", async () => {
        const saveMaster = vi.fn().mockRejectedValueOnce("boom");
        const saveDoc = vi.fn(async () => docRow());
        const db = { saveMaster, saveDoc } as unknown as DataPort;
        const result = await commitLegacyImport(
            db,
            plan([{ kind: "Party", draft: { MasterKind: "Party", Name: "A", Body: {} } }], []),
        );
        expect(result.failed).toEqual([{ label: 'Party "A"', message: "boom" }]);
    });

    it("empty plan yields zero counts and no failures", async () => {
        const db = { saveMaster: vi.fn(), saveDoc: vi.fn() } as unknown as DataPort;
        const result = await commitLegacyImport(db, plan([], []));
        expect(result).toEqual({ masterCreated: 0, ticketCreated: 0, failed: [] });
    });
});
