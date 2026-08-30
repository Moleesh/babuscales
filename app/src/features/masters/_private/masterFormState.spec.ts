import { describe, expect, it } from "vitest";

import type { MasterColumn } from "@engines/schemaEngine";
import type { MasterRow } from "@db/types";

import { emptyForm, formFromRow } from "./masterFormState";

const col = (overrides: Partial<MasterColumn>): MasterColumn => ({
    FieldId: "f1",
    Kind: "Text",
    ...overrides,
});

const masterRow = (overrides: Partial<MasterRow>): MasterRow => ({
    MasterId: "m1",
    MasterKind: "Party",
    Name: "Acme",
    Body: {},
    IsActive: true,
    UpdatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

describe("emptyForm", () => {
    it("all fields blank, extra empty", () => {
        expect(emptyForm()).toEqual({ name: "", weightKg: "", capturedAt: "", partyName: "", extra: {} });
    });
});

describe("formFromRow: StoredTare", () => {
    it("maps WeightKg/CapturedAt/PartyName from a valid StoredTare body", () => {
        const row = masterRow({
            MasterKind: "StoredTare",
            Body: { WeightKg: 1000, CapturedAt: "2026-01-15T10:30:00.000Z", PartyName: "Acme" },
        });
        const form = formFromRow(row, []);
        expect(form.weightKg).toBe("1000");
        expect(form.partyName).toBe("Acme");
        // toDateTimeLocal reads local getters, so the expected value must be
        // derived the same way rather than hardcoded against a fixed offset.
        const expected = (() => {
            const d = new Date("2026-01-15T10:30:00.000Z");
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        })();
        expect(form.capturedAt).toBe(expected);
    });

    it("blank PartyName when absent", () => {
        const row = masterRow({
            MasterKind: "StoredTare",
            Body: { WeightKg: 500, CapturedAt: "2026-01-15T10:30:00.000Z" },
        });
        expect(formFromRow(row, []).partyName).toBe("");
    });

    it("blank capturedAt for an unparsable date rather than throwing", () => {
        const row = masterRow({
            MasterKind: "StoredTare",
            Body: { WeightKg: 500, CapturedAt: "not-a-date" },
        });
        expect(formFromRow(row, []).capturedAt).toBe("");
    });

    it("falls through to the generic (non-StoredTare) path when the body shape doesn't validate", () => {
        const row = masterRow({ MasterKind: "StoredTare", Body: { bogus: true } });
        const form = formFromRow(row, []);
        expect(form.weightKg).toBe("");
        expect(form.extra).toEqual({});
    });
});

describe("formFromRow: generic columns", () => {
    it("reads each column's value off Body[FieldId] as a string", () => {
        const columns = [col({ FieldId: "rate", Kind: "Money" }), col({ FieldId: "qty", Kind: "Number" })];
        const row = masterRow({ Body: { rate: "12.50", qty: 42 } });
        const form = formFromRow(row, columns);
        expect(form.extra).toEqual({ rate: "12.50", qty: "42" });
    });

    it("blank string for a missing or non-primitive column value", () => {
        const columns = [col({ FieldId: "notes", Kind: "Text" }), col({ FieldId: "nested", Kind: "Text" })];
        const row = masterRow({ Body: { nested: { a: 1 } } });
        const form = formFromRow(row, columns);
        expect(form.extra).toEqual({ notes: "", nested: "" });
    });

    it("stringifies a boolean column value", () => {
        const columns = [col({ FieldId: "active", Kind: "Boolean" })];
        const row = masterRow({ Body: { active: true } });
        expect(formFromRow(row, columns).extra).toEqual({ active: "true" });
    });

    it("carries the row Name through unconditionally", () => {
        const row = masterRow({ Name: "Beta Traders" });
        expect(formFromRow(row, []).name).toBe("Beta Traders");
    });
});
