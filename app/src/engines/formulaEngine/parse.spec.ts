import { describe, expect, it } from "vitest";

import { parseFormula } from "./parse";

// Split into two `describe` blocks (over the 60-line function budget as one —
// docs/CodingStandards.md): expression shapes vs. call/unary/error cases.
describe("parseFormula — expression shapes", () => {
    it("parses a bare number literal", () => {
        expect(parseFormula("42")).toEqual({ kind: "Number", value: "42" });
    });

    it("respects arithmetic precedence: multiplicative before additive", () => {
        // 1 + 2 * 3  ->  1 + (2 * 3)
        expect(parseFormula("1 + 2 * 3")).toEqual({
            kind: "Binary",
            op: "+",
            left: { kind: "Number", value: "1" },
            right: {
                kind: "Binary",
                op: "*",
                left: { kind: "Number", value: "2" },
                right: { kind: "Number", value: "3" },
            },
        });
    });

    it("lets parentheses override precedence", () => {
        expect(parseFormula("(1 + 2) * 3")).toEqual({
            kind: "Binary",
            op: "*",
            left: {
                kind: "Binary",
                op: "+",
                left: { kind: "Number", value: "1" },
                right: { kind: "Number", value: "2" },
            },
            right: { kind: "Number", value: "3" },
        });
    });
});

describe("parseFormula — calls, unary and errors", () => {
    it("parses a function call with multiple arguments", () => {
        expect(parseFormula("If(Credit > 0, Gross, Tare)")).toEqual({
            kind: "Call",
            callee: "If",
            args: [
                {
                    kind: "Binary",
                    op: ">",
                    left: { kind: "Identifier", name: "Credit" },
                    right: { kind: "Number", value: "0" },
                },
                { kind: "Identifier", name: "Gross" },
                { kind: "Identifier", name: "Tare" },
            ],
        });
    });

    it("parses a zero-argument call", () => {
        expect(parseFormula("Now()")).toEqual({ kind: "Call", callee: "Now", args: [] });
    });

    it("parses unary minus, including nested", () => {
        expect(parseFormula("--5")).toEqual({
            kind: "Unary",
            op: "-",
            operand: { kind: "Unary", op: "-", operand: { kind: "Number", value: "5" } },
        });
    });

    it("throws on a dangling operator", () => {
        expect(() => parseFormula("1 +")).toThrow(/Formula parse error/);
    });

    it("throws when trailing tokens remain after a complete expression", () => {
        expect(() => parseFormula("1 2")).toThrow(/expected EOF/);
    });
});
