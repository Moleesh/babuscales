import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext } from "@engines/formulaEngine";

// Plain `JSON.stringify(v)` crashes with "Do not know how to serialize a
// BigInt" the moment `v` is a Decimal (its `mantissa` field is a bigint) —
// exactly the case this hits on a formula mistake like `VisibleWhen: "Gross"`.
// That crash would replace the intended "expected a boolean" message with an
// unrelated one (same bug @engines/formulaEngine/evaluate.ts's describeValue
// was written to avoid).
const describeResult = (v: unknown): string =>
    JSON.stringify(v, (_key, val: unknown) => (typeof val === "bigint" ? val.toString() : val));

/** `VisibleWhen`/`RequiredWhen`/`ReadOnlyWhen` — no formula means the gate is always open. */
export const evaluateGate = (formula: string | undefined, ctx: FormulaContext): boolean => {
    if (!formula) return true;
    const result = evaluateFormula(formula, ctx);
    if (typeof result !== "boolean") {
        throw new Error(
            `Formula "${formula}" must evaluate to a boolean, got ${describeResult(result)}`,
        );
    }
    return result;
};
