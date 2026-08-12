import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext, FormulaValue } from "@engines/formulaEngine";
import { fromInt, toNumber } from "@engines/formulaEngine/Decimal";
import type { Decimal } from "@engines/formulaEngine/Decimal";

// Ported from the mock's `RATE = { tareCharge:100, grossCharge:150 }`. The
// schema's own `Charge` field (src/engines/schemaEngine) carries the
// aspirational formula string `"Type.TareCharge + Type.GrossCharge"` —
// but the mock's *actual* runtime charge (`P()`'s `c.charge`) never reads
// a per-VehicleType rate at all; it's this one flat pair, added together,
// for every ticket with both weights in. That's what's ported here — a
// real per-vehicle-type rate table is a bigger feature (VehicleType master
// rows currently carry no custom fields at all — app/README.md known gap)
// than "the charge on a printed ticket is a real number instead of a
// fabricated demo one", which is what this closes.
//
// Hardcoded rather than Settings-driven for now: a real installation would
// want this admin-editable, tracked as a follow-up in app/README.md.
export const TARE_CHARGE_INR = 100;
export const GROSS_CHARGE_INR = 150;

// Wired to the real formula engine (§8.1) rather than plain `+` — the flat
// rate pair is still hardcoded (see above), but the arithmetic itself now
// runs through `evaluateFormula` exactly like a schema `Formula` field
// would, so this is no longer a special hand-computed case sitting next to
// the engine that was built to do exactly this.
const CHARGE_FORMULA = "TareCharge + GrossCharge";

const chargeContext: FormulaContext = {
    getVariable: (name: string): FormulaValue => {
        if (name === "TareCharge") return fromInt(TARE_CHARGE_INR);
        if (name === "GrossCharge") return fromInt(GROSS_CHARGE_INR);
        throw new Error(`computeCharge: unknown variable "${name}"`);
    },
};

const asDecimal = (v: FormulaValue): Decimal => {
    if (typeof v === "object") return v;
    throw new Error(`computeCharge: formula "${CHARGE_FORMULA}" did not evaluate to a number`);
};

/** `null` until both weights are in — same "nothing to total yet" rule `summarizeTicketRows` already applies to net tonnage. */
export const computeCharge = (isComplete: boolean): number | null =>
    isComplete ? toNumber(asDecimal(evaluateFormula(CHARGE_FORMULA, chargeContext))) : null;
