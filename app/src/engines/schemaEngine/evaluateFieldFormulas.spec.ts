import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FormulaContext } from "@engines/formulaEngine";
import { fromInt } from "@engines/formulaEngine/Decimal";

import { evaluateGate } from "./evaluateFieldFormulas";

describe("evaluateGate", () => {
    const mockContext: FormulaContext = {
        getVariable: vi.fn(() => fromInt(100)),
    };

    let warnSpy: ReturnType<typeof vi.spyOn<typeof console, "warn">>;
    beforeEach(() => {
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

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

    it("fails safe (returns true) when formula evaluates to a non-boolean result", () => {
        const ctx: FormulaContext = {
            getVariable: vi.fn(() => fromInt(100)),
        };
        const result = evaluateGate("Gross", ctx);
        expect(result).toBe(true);
        expect(warnSpy).toHaveBeenCalled();
    });

    it("fails safe (returns true) when formula evaluates to a string", () => {
        const ctx: FormulaContext = {
            getVariable: () => "text",
        };
        const result = evaluateGate('"hello"', ctx);
        expect(result).toBe(true);
    });

    it("fails safe (returns true) when formula is syntactically invalid", () => {
        const ctx: FormulaContext = {
            getVariable: vi.fn(() => fromInt(100)),
        };
        const result = evaluateGate("Gross >", ctx);
        expect(result).toBe(true);
    });
});

describe("evaluateGate — nested If()", () => {
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
});
