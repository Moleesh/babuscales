import { describe, expect, it } from "vitest";

import { chargeToNumber, computeValue } from "./value";

describe("computeValue", () => {
    it("null when netKg is null", () => {
        expect(computeValue(null, "10")).toBeNull();
    });

    it("null when rate is null", () => {
        expect(computeValue(1000, null)).toBeNull();
    });

    it("null when both are null", () => {
        expect(computeValue(null, null)).toBeNull();
    });

    it("computes net(kg)/1000 * rate, rounded", () => {
        expect(computeValue(1000, "100")).toBe(100);
        expect(computeValue(2500, "40")).toBe(100);
    });

    it("rounds to nearest integer (half-up)", () => {
        // 1234/1000 * 10 = 12.34 -> 12
        expect(computeValue(1234, "10")).toBe(12);
        // 1250/1000 * 10 = 12.5 -> 13 (Math.round rounds .5 up)
        expect(computeValue(1250, "10")).toBe(13);
    });

    it("0 net or 0 rate produces 0, not null", () => {
        expect(computeValue(0, "100")).toBe(0);
        expect(computeValue(1000, "0")).toBe(0);
    });

    it("negative net (e.g. a data error) still computes rather than throwing", () => {
        expect(computeValue(-1000, "100")).toBe(-100);
    });

    // Regression: `computeValue` used to call `Decimal.fromInt(rate)` on a
    // rate that could carry a fraction — `fromInt` truncates anything past
    // the decimal point (it's meant for whole-number input), so a rate of
    // "12.50" silently became 12 before the fix. `fromString` (which
    // actually parses the fractional part) is what must be used instead.
    it("does not truncate a fractional rate (fromInt truncation regression)", () => {
        // 1000/1000 * 12.50 = 12.50 -> rounds to 13, never 12.
        expect(computeValue(1000, "12.50")).toBe(13);
    });
});

describe("chargeToNumber", () => {
    it("0 for null", () => {
        expect(chargeToNumber(null)).toBe(0);
    });

    it("parses a decimal-string charge", () => {
        expect(chargeToNumber("12.50")).toBe(12.5);
        expect(chargeToNumber("100")).toBe(100);
    });

    it("0 for an unparsable string rather than throwing", () => {
        expect(chargeToNumber("not-a-number")).toBe(0);
    });
});
