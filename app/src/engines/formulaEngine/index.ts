export * as Decimal from "./Decimal";
export { evaluateExpr } from "./evaluate";
export type { FormulaContext, FormulaValue } from "./evaluate";
export { parseFormula } from "./parse";
export type { FormulaExpr } from "./parse";

import { evaluateExpr } from "./evaluate";
import type { FormulaContext, FormulaValue } from "./evaluate";
import { parseFormula } from "./parse";

/** Parses and evaluates in one call — the common case for a field's formula (PLAN §8.1). */
export const evaluateFormula = (source: string, ctx: FormulaContext): FormulaValue =>
    evaluateExpr(parseFormula(source), ctx);
