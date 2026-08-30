import { describe, expect, it } from "vitest";

import type { MasterColumn } from "@engines/schemaEngine";

import { buildMasterBody, validateMasterFormNumbers } from "./masterFormBody";
import { emptyForm, type MasterFormState } from "./masterFormState";

const col = (overrides: Partial<MasterColumn>): MasterColumn => ({
    FieldId: "f1",
    Kind: "Text",
    ...overrides,
});

const formWith = (overrides: Partial<MasterFormState>): MasterFormState => ({
    ...emptyForm(),
    ...overrides,
});

describe("validateMasterFormNumbers: StoredTare", () => {
    it("null (valid) for an empty weightKg", () => {
        expect(validateMasterFormNumbers("StoredTare", formWith({ weightKg: "" }), [], false)).toBeNull();
    });

    it("null for a valid integer weight", () => {
        expect(validateMasterFormNumbers("StoredTare", formWith({ weightKg: "1000" }), [], false)).toBeNull();
    });

    it("error for a non-numeric weight", () => {
        expect(validateMasterFormNumbers("StoredTare", formWith({ weightKg: "abc" }), [], false)).toBe(
            "masters.error.invalidWeight",
        );
    });

    it("DecimalsAllowed off: a fractional weight is invalid", () => {
        expect(validateMasterFormNumbers("StoredTare", formWith({ weightKg: "1000.5" }), [], false)).toBe(
            "masters.error.invalidWeight",
        );
    });

    it("DecimalsAllowed on: a <=2-decimal-digit weight is valid", () => {
        expect(validateMasterFormNumbers("StoredTare", formWith({ weightKg: "1000.25" }), [], true)).toBeNull();
    });

    it("DecimalsAllowed on: still rejects more than 2 fractional digits", () => {
        expect(validateMasterFormNumbers("StoredTare", formWith({ weightKg: "1000.123" }), [], true)).toBe(
            "masters.error.invalidWeight",
        );
    });
});

describe("validateMasterFormNumbers: generic Number/Money columns", () => {
    it("null when every Number/Money field is empty or absent", () => {
        const columns = [col({ FieldId: "rate", Kind: "Money" }), col({ FieldId: "qty", Kind: "Number" })];
        expect(validateMasterFormNumbers("Party", formWith({ extra: {} }), columns, false)).toBeNull();
    });

    it("error for a non-numeric Number column", () => {
        const columns = [col({ FieldId: "qty", Kind: "Number" })];
        expect(
            validateMasterFormNumbers("Party", formWith({ extra: { qty: "abc" } }), columns, false),
        ).toBe("masters.error.invalidNumber");
    });

    it("Money column: DecimalsAllowed off rejects a fractional rate", () => {
        const columns = [col({ FieldId: "rate", Kind: "Money" })];
        expect(
            validateMasterFormNumbers("Party", formWith({ extra: { rate: "12.50" } }), columns, false),
        ).toBe("masters.error.invalidNumber");
    });

    it("Money column: DecimalsAllowed on accepts a <=2-decimal-digit rate", () => {
        const columns = [col({ FieldId: "rate", Kind: "Money" })];
        expect(
            validateMasterFormNumbers("Party", formWith({ extra: { rate: "12.50" } }), columns, true),
        ).toBeNull();
    });

    it("ignores non-Number/Money columns entirely", () => {
        const columns = [col({ FieldId: "notes", Kind: "Text" })];
        expect(
            validateMasterFormNumbers("Party", formWith({ extra: { notes: "not a number" } }), columns, false),
        ).toBeNull();
    });
});

describe("buildMasterBody: StoredTare", () => {
    it("parses weightKg to a number, PartyName trimmed to undefined when blank", () => {
        const body = buildMasterBody("StoredTare", formWith({ weightKg: "1000", partyName: "  " }), []);
        expect(body.WeightKg).toBe(1000);
        expect(body.PartyName).toBeUndefined();
    });

    it("invalid weightKg falls back to 0 rather than NaN", () => {
        const body = buildMasterBody("StoredTare", formWith({ weightKg: "abc" }), []);
        expect(body.WeightKg).toBe(0);
    });

    it("uses now() when capturedAt is blank, else the given date", () => {
        const withDate = buildMasterBody(
            "StoredTare",
            formWith({ weightKg: "1000", capturedAt: "2026-01-01T10:00" }),
            [],
        );
        expect(typeof withDate.CapturedAt).toBe("string");
        const withoutDate = buildMasterBody("StoredTare", formWith({ weightKg: "1000", capturedAt: "" }), []);
        expect(typeof withoutDate.CapturedAt).toBe("string");
    });
});

describe("buildMasterBody: generic columns", () => {
    it("omits empty/blank fields from the body entirely", () => {
        const columns = [col({ FieldId: "notes", Kind: "Text" })];
        const body = buildMasterBody("Party", formWith({ extra: { notes: "  " } }), columns);
        expect(body).not.toHaveProperty("notes");
    });

    it("Money columns keep the raw decimal string, not a widened Number", () => {
        const columns = [col({ FieldId: "rate", Kind: "Money" })];
        const body = buildMasterBody("Party", formWith({ extra: { rate: "12.50" } }), columns);
        expect(body.rate).toBe("12.50");
        expect(typeof body.rate).toBe("string");
    });

    it("Number columns are converted to a JS number", () => {
        const columns = [col({ FieldId: "qty", Kind: "Number" })];
        const body = buildMasterBody("Party", formWith({ extra: { qty: "42" } }), columns);
        expect(body.qty).toBe(42);
    });

    it("Boolean columns parse 'true'/anything-else to a real boolean", () => {
        const columns = [col({ FieldId: "active", Kind: "Boolean" })];
        expect(buildMasterBody("Party", formWith({ extra: { active: "true" } }), columns).active).toBe(true);
        expect(buildMasterBody("Party", formWith({ extra: { active: "false" } }), columns).active).toBe(false);
    });

    it("Text/Select columns pass through the raw trimmed string", () => {
        const columns = [col({ FieldId: "notes", Kind: "Text" })];
        const body = buildMasterBody("Party", formWith({ extra: { notes: "hello" } }), columns);
        expect(body.notes).toBe("hello");
    });
});
