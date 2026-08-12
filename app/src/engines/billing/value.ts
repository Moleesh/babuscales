import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext, FormulaValue } from "@engines/formulaEngine";
import { fromInt, toNumber } from "@engines/formulaEngine/Decimal";
import type { Decimal } from "@engines/formulaEngine/Decimal";

// Ported from the mock's own live calc (demo/BabuScales-demo.html's
// `recalculate()`: `value: net != null && mat ? Math.round(net / 1000 * mat.rate) : null`)
// — the schema's own `Value` field (src/engines/schemaEngine's
// DEFAULT_TICKET_SCHEMA doesn't carry it; the mock's aspirational
// DEFAULT_SCHEMA upload fixture does: `Formula:"Round(Net / 1000 * Material.Rate, 0)"`).
// Now runs through `engines/formulaEngine` for real (§8.1) — the formula
// string below is that same shape, using plain identifiers since the
// formula language has no dotted-path lookup — rather than hand-computed
// `Math.round`, closing the "computeCharge's own precedent" gap the old
// comment here used to point at.
const VALUE_FORMULA = "Round(Net / 1000 * Rate, 0)";

const asDecimal = (v: FormulaValue): Decimal => {
    if (typeof v === "object") return v;
    throw new Error(`computeValue: formula "${VALUE_FORMULA}" did not evaluate to a number`);
};

const buildContext = (netKg: number, rate: number): FormulaContext => ({
    getVariable: (name: string): FormulaValue => {
        if (name === "Net") return fromInt(netKg);
        if (name === "Rate") return fromInt(rate);
        throw new Error(`computeValue: unknown variable "${name}"`);
    },
});

export const computeValue = (netKg: number | null, rate: number | null): number | null => {
    if (netKg === null || rate === null) return null;
    return toNumber(asDecimal(evaluateFormula(VALUE_FORMULA, buildContext(netKg, rate))));
};
