import { describe, expect, it, vi } from "vitest";

import type { FormulaContext } from "@engines/formulaEngine";
import { fromInt } from "@engines/formulaEngine/Decimal";

import { evaluateGate } from "./evaluateFieldFormulas";

describe("evaluateGate", () => {
    const mockContext: FormulaContext = {
        getVariable: vi.fn(() => fromInt(100)),
    };

    it("returns true when formula is undefined", () => {
        const result = evaluateGate(undefined, mockContext);
        expect(result).toBe(true);
    });

    it("returns true when formula is an empty string", () => {
        const result = evaluateGate("", mockContext);
        expect(result).toBe(true);
    });

    it("returns true when formula evaluates to true", () => {
        const ctx: FormulaContext = {
            getVariable: vi.fn(() => fromInt(100)),
        };
        const result = evaluateGate("Gross > 50", ctx);
        expect(result).toBe(true);
    });

    it("returns false when formula evaluates to false", () => {
        const ctx: FormulaContext = {
            getVariable: vi.fn(() => fromInt(30)),
        };
        const result = evaluateGate("Gross > 50", ctx);
        expect(result).toBe(false);
    });

    it("throws an error when formula evaluates to a non-boolean result", () => {
        const ctx: FormulaContext = {
            getVariable: vi.fn(() => fromInt(100)),
        };
        expect(() => evaluateGate("Gross", ctx)).toThrow(
            /must evaluate to a boolean/,
        );
    });

    it("throws an error when formula evaluates to a string", () => {
        const ctx: FormulaContext = {
            getVariable: () => "text",
        };
        expect(() => evaluateGate('"hello"', ctx)).toThrow(
            /must evaluate to a boolean/,
        );
    });

    // The formula language (@engines/formulaEngine/tokenize.ts) has no `&&`/
    // `||` operators — boolean composition only happens via nested `If()`
    // calls, so that's what "complex" means for this grammar.
    it("handles a nested If() expression", () => {
        const ctx: FormulaContext = {
            getVariable: (name: string) => {
                if (name === "Gross") return fromInt(100);
                if (name === "Tare") return fromInt(10);
                return fromInt(0);
            },
        };
        const result = evaluateGate("If(Gross > 50, Tare > 5, Tare > 100)", ctx);
        expect(result).toBe(true);
    });

    it("throws an error when formula is syntactically invalid", () => {
        const ctx: FormulaContext = {
            getVariable: vi.fn(() => fromInt(100)),
        };
        expect(() => evaluateGate("Gross >", ctx)).toThrow();
    });
});
