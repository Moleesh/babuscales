import { describe, expect, it } from "vitest";

import {
    defaultCaptureKind,
    deriveWeights,
    emptyTicketBody,
    findCapture,
    grossCaptures,
    hasCapture,
    isOpenTicket,
    parseTicketBody,
    type Capture,
} from "./ticketBody";

const capture = (overrides: Partial<Capture>): Capture => ({
    CaptureId: "c1",
    Type: "Tare",
    WeightKg: 1000,
    At: "2026-01-01T00:00:00.000Z",
    Operator: "Op",
    Source: "Indicator",
    Images: [],
    ...overrides,
});

describe("findCapture/hasCapture", () => {
    it("finds the first capture of a type", () => {
        const tare = capture({ Type: "Tare" });
        const gross = capture({ Type: "Gross", CaptureId: "c2" });
        expect(findCapture([tare, gross], "Gross")).toBe(gross);
    });

    it("returns undefined / false when absent", () => {
        expect(findCapture([], "Tare")).toBeUndefined();
        expect(hasCapture([], "Tare")).toBe(false);
    });

    it("hasCapture is true once present", () => {
        expect(hasCapture([capture({ Type: "Gross" })], "Gross")).toBe(true);
    });
});

describe("grossCaptures", () => {
    it("filters to only Gross-type captures, preserving order", () => {
        const g1 = capture({ Type: "Gross", CaptureId: "g1" });
        const t = capture({ Type: "Tare", CaptureId: "t1" });
        const g2 = capture({ Type: "Gross", CaptureId: "g2" });
        expect(grossCaptures([g1, t, g2])).toEqual([g1, g2]);
    });

    it("empty when no captures", () => {
        expect(grossCaptures([])).toEqual([]);
    });
});

describe("deriveWeights", () => {
    it("all null with no captures", () => {
        expect(deriveWeights([])).toEqual({ tareKg: null, grossKg: null, netKg: null });
    });

    it("tareKg set, gross/net null with only a Tare", () => {
        const result = deriveWeights([capture({ Type: "Tare", WeightKg: 500 })]);
        expect(result).toEqual({ tareKg: 500, grossKg: null, netKg: null });
    });

    it("grossKg set, tare/net null with only a Gross", () => {
        const result = deriveWeights([capture({ Type: "Gross", WeightKg: 1500 })]);
        expect(result).toEqual({ tareKg: null, grossKg: 1500, netKg: null });
    });

    it("single tare + single gross: net is their absolute difference", () => {
        const result = deriveWeights([
            capture({ Type: "Tare", WeightKg: 500 }),
            capture({ Type: "Gross", WeightKg: 1500, CaptureId: "g1" }),
        ]);
        expect(result).toEqual({ tareKg: 500, grossKg: 1500, netKg: 1000 });
    });

    it("multi-gross: grossKg sums all grosses; netKg sums each gross's own net against the one tare, not grossKg - tareKg", () => {
        const result = deriveWeights([
            capture({ Type: "Tare", WeightKg: 500 }),
            capture({ Type: "Gross", WeightKg: 1500, CaptureId: "g1" }),
            capture({ Type: "Gross", WeightKg: 1200, CaptureId: "g2" }),
        ]);
        // grossKg = 1500+1200 = 2700; naive (grossKg - tareKg) would be 2200
        // but netKg is (1500-500)+(1200-500) = 1000+700 = 1700
        expect(result).toEqual({ tareKg: 500, grossKg: 2700, netKg: 1700 });
    });

    it("clamps to 0 rather than going negative or swapping when gross weighs lighter than tare", () => {
        const result = deriveWeights([
            capture({ Type: "Tare", WeightKg: 1500 }),
            capture({ Type: "Gross", WeightKg: 500, CaptureId: "g1" }),
        ]);
        expect(result.netKg).toBe(0);
    });
});

describe("isOpenTicket", () => {
    it("cancelled ticket is never open, regardless of captures", () => {
        expect(isOpenTicket(true, [capture({ Type: "Tare" })])).toBe(false);
        expect(isOpenTicket(true, [])).toBe(false);
    });

    it("no captures at all: not open", () => {
        expect(isOpenTicket(false, [])).toBe(false);
    });

    it("exactly one of tare/gross present: open", () => {
        expect(isOpenTicket(false, [capture({ Type: "Tare" })])).toBe(true);
        expect(isOpenTicket(false, [capture({ Type: "Gross" })])).toBe(true);
    });

    it("both present: not open (closed)", () => {
        expect(
            isOpenTicket(false, [
                capture({ Type: "Tare" }),
                capture({ Type: "Gross", CaptureId: "g1" }),
            ]),
        ).toBe(false);
    });
});

describe("defaultCaptureKind", () => {
    it("offers Tare first when nothing captured", () => {
        expect(defaultCaptureKind([])).toBe("Tare");
    });

    it("offers whichever of the pair is still missing", () => {
        expect(defaultCaptureKind([capture({ Type: "Tare" })])).toBe("Gross");
        expect(defaultCaptureKind([capture({ Type: "Gross" })])).toBe("Tare");
    });

    it("both present: null (ticket is final)", () => {
        const captures = [capture({ Type: "Tare" }), capture({ Type: "Gross", CaptureId: "g1" })];
        expect(defaultCaptureKind(captures)).toBeNull();
    });
});

describe("emptyTicketBody", () => {
    it("returns BodyVersion 1 with no captures", () => {
        expect(emptyTicketBody()).toEqual({ BodyVersion: 1, Captures: [] });
    });
});

describe("parseTicketBody", () => {
    it("parses a minimal valid body", () => {
        const body = parseTicketBody({ BodyVersion: 1, Captures: [] });
        expect(body).toEqual({ BodyVersion: 1, Captures: [] });
    });

    it("parses a full body with a capture and custom fields", () => {
        const raw = {
            BodyVersion: 1,
            VehicleNo: "TN01AB1234",
            Party: "Acme",
            Captures: [capture({})],
            PrintCount: 2,
            CustomFields: { foo: "bar", n: 5, b: true, z: null },
        };
        const body = parseTicketBody(raw);
        expect(body.VehicleNo).toBe("TN01AB1234");
        expect(body.Captures).toHaveLength(1);
        expect(body.CustomFields).toEqual({ foo: "bar", n: 5, b: true, z: null });
    });

    it("throws on a missing required field (BodyVersion)", () => {
        expect(() => parseTicketBody({ Captures: [] })).toThrow();
    });

    it("throws on a malformed capture (bad Type enum)", () => {
        expect(() =>
            parseTicketBody({
                BodyVersion: 1,
                Captures: [{ ...capture({}), Type: "Bogus" }],
            }),
        ).toThrow();
    });

    it("throws when WeightKg is not an integer", () => {
        expect(() =>
            parseTicketBody({
                BodyVersion: 1,
                Captures: [{ ...capture({}), WeightKg: 12.5 }],
            }),
        ).toThrow();
    });

    it("passthrough preserves unknown top-level keys (e.g. ImportRef)", () => {
        const body = parseTicketBody({ BodyVersion: 1, Captures: [], ImportRef: "legacy-1" });
        expect((body as unknown as { ImportRef: string }).ImportRef).toBe("legacy-1");
    });
});
