import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext, FormulaValue } from "@engines/formulaEngine";
import { fromString, toNumber } from "@engines/formulaEngine/Decimal";
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

// Both `Net` and `Rate` go through `Decimal.fromString`, never `fromInt`.
// `fromInt` does `BigInt(Math.trunc(n))`, which silently truncates any
// fractional operand (12.50 became 12; 1500.5kg became 1500kg) — the
// concrete money-precision bug this migration exists to fix. `netKg` is a
// plain JS number (weight arithmetic isn't Decimal-backed, see
// deriveWeights), so it's stringified first — `String(1500.5)` round-trips
// through `fromString` exactly, unlike truncating through `fromInt`.
const buildContext = (netKg: number, rate: Decimal): FormulaContext => ({
    getVariable: (name: string): FormulaValue => {
        if (name === "Net") return fromString(String(netKg));
        if (name === "Rate") return rate;
        throw new Error(`computeValue: unknown variable "${name}"`);
    },
});

// The computed `value` is never persisted (display/print only, recomputed
// live every render) — `toNumber` here is the legitimate "display" use its
// own doc comment calls out, not a round-trip through storage.
export const computeValue = (netKg: number | null, rate: string | null): number | null => {
    if (netKg === null || rate === null) return null;
    return toNumber(asDecimal(evaluateFormula(VALUE_FORMULA, buildContext(netKg, fromString(rate)))));
};

// `TicketBody.Charge`/`TicketRow.charge` are decimal strings at rest — every
// display/aggregation site (report totals, dashboard KPIs, outbound
// integration payloads) needs a plain number for arithmetic or formatting.
// `toNumber` here is the same legitimate "display only" use as above; none
// of these call sites round-trip the result back into storage. An
// unparsable string (should never happen — both come from `Decimal.fromString`-
// validated input) is treated the same as "no charge" rather than throwing.
export const chargeToNumber = (charge: string | null): number => {
    if (charge === null) return 0;
    try {
        return toNumber(fromString(charge));
    } catch {
        return 0;
    }
};
