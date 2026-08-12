import { describe, expect, it } from "vitest";

import { fromString, toDecimalString } from "./Decimal";
import type { FormulaContext, FormulaValue } from "./evaluate";
import { evaluateFormula } from "./index";

const asString = (value: FormulaValue): string =>
    typeof value === "object" ? toDecimalString(value) : String(value);

const CTX = (vars: Record<string, FormulaValue>): FormulaContext => ({
    getVariable: (name) => {
        const value = vars[name];
        if (value === undefined) throw new Error(`unknown variable "${name}"`);
        return value;
    },
});

describe("evaluateFormula — arithmetic and comparisons", () => {
    it("evaluates arithmetic with normal precedence", () => {
        expect(asString(evaluateFormula("1 + 2 * 3", CTX({})))).toBe("7");
    });

    it("resolves identifiers through the context", () => {
        const ctx = CTX({ Gross: fromString("3500"), Tare: fromString("1000") });
        expect(asString(evaluateFormula("Gross - Tare", ctx))).toBe("2500");
    });

    it("evaluates numeric comparisons to booleans", () => {
        expect(evaluateFormula("5 > 3", CTX({}))).toBe(true);
        expect(evaluateFormula("5 < 3", CTX({}))).toBe(false);
    });

    it("compares strings by equality, not by Decimal parsing", () => {
        const ctx = CTX({ Category: "Mineral" });
        expect(evaluateFormula('Category == "Mineral"', ctx)).toBe(true);
        expect(evaluateFormula('Category != "Mineral"', ctx)).toBe(false);
    });
});

describe("evaluateFormula — built-in functions", () => {
    it("If() picks a branch by its boolean condition", () => {
        const ctx = CTX({ Credit: fromString("100") });
        expect(asString(evaluateFormula("If(Credit > 0, 1, 0)", ctx))).toBe("1");
    });

    it("Abs() and Ceil() operate on a single Decimal argument", () => {
        expect(asString(evaluateFormula("Abs(-5)", CTX({})))).toBe("5");
        expect(asString(evaluateFormula("Ceil(2.01)", CTX({})))).toBe("3");
    });

    it("Round() defaults to 0 decimal places, or takes an explicit scale", () => {
        expect(asString(evaluateFormula("Round(1.5)", CTX({})))).toBe("2");
        expect(asString(evaluateFormula("Round(1.005, 2)", CTX({})))).toBe("1.01");
    });

    it("Min()/Max() pick between two Decimal arguments", () => {
        expect(asString(evaluateFormula("Min(3, 7)", CTX({})))).toBe("3");
        expect(asString(evaluateFormula("Max(3, 7)", CTX({})))).toBe("7");
    });

    it("dispatches an unrecognised function to ctx.callFunction when provided", () => {
        const ctx: FormulaContext = {
            getVariable: () => fromString("0"),
            callFunction: (name, args) => {
                if (name === "Rate") return fromString("2.5");
                throw new Error(`unexpected call to ${name} with ${args.length} args`);
            },
        };
        expect(asString(evaluateFormula("Rate(Material)", ctx))).toBe("2.5");
    });

    it("throws on a truly unknown function with no callFunction fallback", () => {
        expect(() => evaluateFormula("Mystery(1)", CTX({}))).toThrow(/unknown function/);
    });
});

describe("evaluateFormula — errors", () => {
    it("rejects a non-boolean condition passed where a boolean is required", () => {
        expect(() => evaluateFormula("If(1, 2, 3)", CTX({}))).toThrow(/expected a boolean/);
    });

    it("rejects a non-numeric operand in arithmetic", () => {
        const ctx = CTX({ Category: "Mineral" });
        expect(() => evaluateFormula("Category + 1", ctx)).toThrow(/expected a number/);
    });
});
