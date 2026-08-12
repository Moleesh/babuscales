import { describe, expect, it } from "vitest";

import {
    abs,
    add,
    ceilToInt,
    compare,
    div,
    fromInt,
    fromString,
    isZero,
    mul,
    negate,
    round,
    sub,
    toDecimalString,
    toNumber,
    ZERO,
} from "./Decimal";

describe("Decimal.fromString", () => {
    it("parses a plain integer literal", () => {
        expect(fromString("18780")).toEqual({ mantissa: 18780n, scale: 0 });
    });

    it("parses a negative decimal literal, tracking scale as fractional-digit count", () => {
        expect(fromString("-42.50")).toEqual({ mantissa: -4250n, scale: 2 });
    });

    it("throws on anything that isn't a plain decimal literal (never eval)", () => {
        expect(() => fromString("1 + 1")).toThrow(/not a plain decimal literal/);
        expect(() => fromString("abc")).toThrow(/not a plain decimal literal/);
    });
});

describe("Decimal.fromInt", () => {
    it("truncates a JS number to an integer-scale Decimal", () => {
        expect(fromInt(42)).toEqual({ mantissa: 42n, scale: 0 });
        expect(fromInt(42.9)).toEqual({ mantissa: 42n, scale: 0 });
    });
});

describe("Decimal arithmetic", () => {
    it("adds two values, aligning to the larger scale", () => {
        expect(toDecimalString(add(fromString("1.5"), fromString("2.25")))).toBe("3.75");
    });

    it("subtracts two values", () => {
        expect(toDecimalString(sub(fromString("5"), fromString("1.5")))).toBe("3.5");
    });

    it("multiplies, adding scales", () => {
        expect(toDecimalString(mul(fromString("2.5"), fromString("4")))).toBe("10.0");
    });

    it("divides to the requested result scale, rounding half-up by default", () => {
        expect(toDecimalString(div(fromString("10"), fromString("3"), 2))).toBe("3.33");
        expect(toDecimalString(div(fromString("1"), fromString("4"), 1))).toBe("0.3"); // 0.25 -> half-up -> 0.3
    });

    it("divides with Down rounding (truncates toward zero)", () => {
        expect(toDecimalString(div(fromString("1"), fromString("4"), 1, "Down"))).toBe("0.2");
    });

    it("divides with Up rounding (always rounds away from zero on any remainder)", () => {
        expect(toDecimalString(div(fromString("1"), fromString("4"), 1, "Up"))).toBe("0.3");
    });

    it("throws on division by zero", () => {
        expect(() => div(fromString("1"), ZERO, 2)).toThrow(/division by zero/);
    });

    it("compares values across differing scales", () => {
        expect(compare(fromString("1.50"), fromString("1.5"))).toBe(0);
        expect(compare(fromString("1"), fromString("2"))).toBe(-1);
        expect(compare(fromString("2"), fromString("1"))).toBe(1);
    });

    it("negates and takes the absolute value", () => {
        expect(toDecimalString(negate(fromString("5")))).toBe("-5");
        expect(toDecimalString(abs(fromString("-5")))).toBe("5");
    });

    it("isZero recognises the zero mantissa regardless of scale", () => {
        expect(isZero(ZERO)).toBe(true);
        expect(isZero(fromString("0.00"))).toBe(true);
        expect(isZero(fromString("0.01"))).toBe(false);
    });
});

describe("Decimal.ceilToInt", () => {
    it("rounds toward +infinity to a whole number", () => {
        expect(toDecimalString(ceilToInt(fromString("2.01")))).toBe("3");
        expect(toDecimalString(ceilToInt(fromString("2.00")))).toBe("2");
        expect(toDecimalString(ceilToInt(fromString("-2.01")))).toBe("-2"); // -2 is the smallest integer >= -2.01
    });
});

describe("Decimal.round", () => {
    it("rounds half-up to the given scale by default", () => {
        expect(toDecimalString(round(fromString("1.005"), 2))).toBe("1.01");
    });
});

describe("Decimal.toDecimalString / toNumber", () => {
    it("round-trips negative and zero-magnitude values without a stray minus sign", () => {
        expect(toDecimalString(fromString("-0.00"))).toBe("0.00");
    });

    it("toNumber converts for display/legacy interop", () => {
        expect(toNumber(fromString("42.50"))).toBe(42.5);
    });
});
