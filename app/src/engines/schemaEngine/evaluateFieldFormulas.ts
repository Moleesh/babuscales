import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext } from "@engines/formulaEngine";

/** `VisibleWhen`/`RequiredWhen`/`ReadOnlyWhen` — no formula means the gate is always open. */
export const evaluateGate = (formula: string | undefined, ctx: FormulaContext): boolean => {
    if (!formula) return true;
    const result = evaluateFormula(formula, ctx);
    if (typeof result !== "boolean") {
        throw new Error(
            `Formula "${formula}" must evaluate to a boolean, got ${JSON.stringify(result)}`,
        );
    }
    return result;
};
