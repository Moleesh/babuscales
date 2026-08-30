import { describe, expect, it } from "vitest";

import { fromString, hasFraction, MAX_DECIMALS_ALLOWED_SCALE, withinDecimalsAllowed } from "./Decimal";

describe("hasFraction", () => {
    it("false for a whole number", () => {
        expect(hasFraction(fromString("12"))).toBe(false);
        expect(hasFraction(fromString("0"))).toBe(false);
    });

    it("false for a decimal literal whose digits are all trailing zeros", () => {
        expect(hasFraction(fromString("12.00"))).toBe(false);
    });

    it("true for any nonzero fractional part", () => {
        expect(hasFraction(fromString("12.5"))).toBe(true);
        expect(hasFraction(fromString("0.01"))).toBe(true);
    });
});

// The shared three-way `Schema.DecimalsAllowed` gate (schemaEngine/types.ts)
// every Money/Weight validation site (masterFormBody.ts, ticketBody.ts's
// Charge path via useWeighingTicket.ts's chargeToStore, useWeighingTicket.ts's
// pushCapture, serialIndicator.ts's pushSample) delegates to instead of
// reimplementing the digit-cap check independently.
describe("withinDecimalsAllowed", () => {
    it("off/absent: only a whole integer passes", () => {
        expect(withinDecimalsAllowed(fromString("12"), false)).toBe(true);
        expect(withinDecimalsAllowed(fromString("12.5"), false)).toBe(false);
        expect(withinDecimalsAllowed(fromString("12.50"), false)).toBe(false);
    });

    it("on: a whole integer still passes", () => {
        expect(withinDecimalsAllowed(fromString("12"), true)).toBe(true);
    });

    it("on: 1 or 2 fractional digits pass", () => {
        expect(withinDecimalsAllowed(fromString("12.5"), true)).toBe(true);
        expect(withinDecimalsAllowed(fromString("12.50"), true)).toBe(true);
    });

    it("on: 3+ fractional digits are rejected even with the flag on", () => {
        expect(withinDecimalsAllowed(fromString("12.505"), true)).toBe(false);
        expect(withinDecimalsAllowed(fromString("12.5001"), true)).toBe(false);
    });

    it("MAX_DECIMALS_ALLOWED_SCALE is exactly 2", () => {
        expect(MAX_DECIMALS_ALLOWED_SCALE).toBe(2);
    });
});
