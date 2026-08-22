import type { FormulaContext, FormulaValue } from "@engines/formulaEngine";
import { toNumber } from "@engines/formulaEngine/Decimal";
import { tokenize } from "@engines/formulaEngine/tokenize";
import type { Token } from "@engines/formulaEngine/tokenize";

// Turns a formula string like "Gross - Tare" plus its resolved `FormulaContext`
// into "Gross − Tare = 32,460 − 12,323" — the substituted half of the
// "Label = formula = substituted = result" pattern CalcFormula.tsx already
// hand-writes for Net/Value (task: "Show this kind of calculation below
// every calculated field"). Generic: walks the same token stream the
// formula engine itself parses from, rather than a second hand-rolled
// parser, so it never drifts from what the formula actually evaluates to.

const OPERATOR_GLYPHS: Record<string, string> = {
    "-": "−",
    "*": "×",
    "/": "÷",
};

const formatToken = (value: FormulaValue): string => {
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string") return value;
    return toNumber(value).toLocaleString("en-IN", { maximumFractionDigits: 3 });
};

/**
 * Rebuilds the formula's own source text, with operators prettified and
 * every plain-variable identifier replaced by its resolved value — a
 * function-call identifier (immediately followed by `(`) is left as-is
 * (e.g. `Round(...)` stays `Round(...)`, only its arguments substitute).
 * Returns `null` if any plain identifier fails to resolve (an input not
 * yet filled in) — same "don't crash the screen" contract as
 * `computeCalcFieldValues`.
 */
export const describeFormulaSubstitution = (formula: string, ctx: FormulaContext): string | null => {
    let tokens: Token[];
    try {
        tokens = tokenize(formula);
    } catch {
        return null;
    }
    const parts: string[] = [];
    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (!token || token.kind === "EOF") continue;
        if (token.kind === "Operator") {
            parts.push(OPERATOR_GLYPHS[token.text] ?? token.text);
            continue;
        }
        if (token.kind === "Identifier") {
            const next = tokens[i + 1];
            const isFunctionCall = next?.kind === "LParen";
            if (isFunctionCall) {
                parts.push(token.text);
                continue;
            }
            try {
                const value = ctx.getVariable(token.text);
                parts.push(formatToken(value));
            } catch {
                return null;
            }
            continue;
        }
        if (token.kind === "LParen") {
            parts.push("(");
            continue;
        }
        if (token.kind === "RParen") {
            parts.push(")");
            continue;
        }
        if (token.kind === "Comma") {
            parts.push(", ");
            continue;
        }
        parts.push(token.text);
    }
    return parts.join(" ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").replace(/ , /g, ", ");
};
