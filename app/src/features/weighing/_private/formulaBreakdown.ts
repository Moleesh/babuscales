import { tokenize } from "@engines/formulaEngine/tokenize";
import type { Token } from "@engines/formulaEngine/tokenize";

// Turns a formula string like "Gross - Tare" into "Gross − Tare" — just the
// calculation itself, operators prettified, no substituted values (task:
// "just show the calculation, no need to substitute value and show" — this
// used to also splice in each variable's resolved value, e.g. "32,460 −
// 12,323", but that's been dropped: the raw formula is enough, and it no
// longer needs a `FormulaContext`/resolved weights to render at all, so it's
// available before anything's even been captured). Generic: walks the same
// token stream the formula engine itself parses from, rather than a second
// hand-rolled parser, so it never drifts from what the formula actually
// evaluates to.

const OPERATOR_GLYPHS: Record<string, string> = {
    "-": "−",
    "*": "×",
    "/": "÷",
};

/**
 * Rebuilds the formula's own source text with operators prettified —
 * identifiers (variables and function names alike) are left exactly as
 * authored. Returns `null` only for a genuinely malformed formula (tokenize
 * failure — a schema-authoring mistake).
 */
export const prettifyFormula = (formula: string): string | null => {
    let tokens: Token[];
    try {
        tokens = tokenize(formula);
    } catch {
        return null;
    }
    const parts: string[] = [];
    for (const token of tokens) {
        if (token.kind === "EOF") continue;
        if (token.kind === "Operator") {
            parts.push(OPERATOR_GLYPHS[token.text] ?? token.text);
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
