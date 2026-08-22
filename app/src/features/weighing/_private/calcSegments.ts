import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext, FormulaValue } from "@engines/formulaEngine";
import { toNumber } from "@engines/formulaEngine/Decimal";
import type { Field } from "@engines/schemaEngine";

import { describeFormulaSubstitution } from "./formulaBreakdown";

// CalcCard's 4 fixed boxes (Gross/Tare/Net/Charge) already own their own
// capture/formula logic (TareGrossBoxes, the Net CalcBox, ChargeBox) —
// any other `Calculated` field is a schema author's own `Formula` chain
// (e.g. a Godown schema's NetAfterBags/EstimatedWeight/.../GodownNet) with
// no dedicated box of its own, which is what this file computes generically.
export const FIXED_CALC_FIELD_IDS = ["Gross", "Tare", "Net", "Charge"];

export interface CalcFieldItem {
    fieldId: string;
    field: Field;
    /** `undefined` when the formula threw (an input not yet filled in, a bad formula) — rendered as "—", never crashes the screen. */
    value: number | undefined;
    /** "Gross − Tare" style substituted-values line — `undefined` when the formula couldn't be described (same reasons `value` can be `undefined`). See formulaBreakdown.ts. */
    breakdown: string | undefined;
}

/**
 * Every non-fixed `Calculated` `Formula` field across the *whole* schema
 * (not just one segment — a Godown-style calc chain like NetAfterBags →
 * EstimatedWeight → ... → GodownNet can live across two different
 * `"Calculated"` segments, e.g. "Weighment Calculations" then "Godown
 * Settlement", each field still referencing the one before it by FieldId,
 * same as a spreadsheet column referencing the one to its left), evaluated
 * in schema order against `ctx`. A field whose formula throws (an input the
 * operator hasn't filled in yet, a genuine schema mistake) just resolves to
 * `undefined` — doesn't stop the fields after it from evaluating.
 */
export interface CalcFieldResults {
    values: Map<string, number | undefined>;
    breakdowns: Map<string, string | undefined>;
}

export const computeCalcFieldValues = (
    fields: Field[],
    ctx: FormulaContext,
    calculatedIds: Set<string>,
): CalcFieldResults => {
    const computed = new Map<string, number | undefined>();
    const breakdowns = new Map<string, string | undefined>();
    const chainedCtx: FormulaContext = {
        ...ctx,
        getVariable: (name: string): FormulaValue => {
            if (computed.has(name)) {
                const value = computed.get(name);
                if (value !== undefined) return { mantissa: BigInt(Math.trunc(value)), scale: 0 };
            }
            return ctx.getVariable(name);
        },
    };
    for (const field of fields) {
        if (field.Kind !== "Formula" || !calculatedIds.has(field.FieldId)) continue;
        if (FIXED_CALC_FIELD_IDS.includes(field.FieldId)) continue;
        try {
            computed.set(field.FieldId, toNumber(evaluateFormula(field.Formula, chainedCtx) as never));
        } catch {
            computed.set(field.FieldId, undefined);
        }
        breakdowns.set(field.FieldId, describeFormulaSubstitution(field.Formula, chainedCtx) ?? undefined);
    }
    return { values: computed, breakdowns };
};

/**
 * One `"Calculated"` FieldSegment's own non-fixed calc-chain fields
 * (Gross/Tare/Net/Charge are rendered by CalcCard's own fixed 4-box grid,
 * not this row), in schema order, each carrying whatever `computeCalcFieldValues`
 * resolved for it. The segment itself is now the grouping (WeighingLeftColumn
 * renders one CalcCard per `"Calculated"` segment) — this just picks that
 * segment's own slice of the already-computed values out.
 */
export const getCalcItemsForFields = (
    fields: Field[],
    results: CalcFieldResults,
): CalcFieldItem[] =>
    fields
        .filter((field) => field.Kind === "Formula")
        .filter((field) => !FIXED_CALC_FIELD_IDS.includes(field.FieldId))
        .map((field) => ({
            fieldId: field.FieldId,
            field,
            value: results.values.get(field.FieldId),
            breakdown: results.breakdowns.get(field.FieldId),
        }));
