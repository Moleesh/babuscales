import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext, FormulaValue } from "@engines/formulaEngine";
import { toNumber } from "@engines/formulaEngine/Decimal";
import type { Field } from "@engines/schemaEngine";

// CalcCard's 4 fixed boxes (Gross/Tare/Net/Charge) already own their own
// capture/formula logic (TareGrossBoxes, the Net CalcBox, ChargeBox) —
// any other `Calculated` field is a schema author's own `Formula` chain
// (e.g. a Godown schema's NetAfterBags/EstimatedWeight/.../GodownNet) with
// no dedicated box of its own, which is what this file computes generically.
export const FIXED_CALC_FIELD_IDS = ["Gross", "Tare", "Net", "Charge"];

export interface CalcSegmentItem {
    fieldId: string;
    field: Field;
    /** `undefined` when the formula threw (an input not yet filled in, a bad formula) — rendered as "—", never crashes the screen. */
    value: number | undefined;
}

export interface CalcSegment {
    segment: "Intermediate" | "Final";
    items: CalcSegmentItem[];
}

/**
 * Every non-fixed `Calculated` `Formula` field in `fields`, evaluated in
 * schema order against `ctx` — each field's own result is fed back in as a
 * variable for the *next* field's formula (`ctx.getVariable` checks
 * `computed` first), so a chain like NetAfterBags → EstimatedWeight →
 * ExcessShortage → TotalAdjustment → GodownGross can reference the step
 * before it by FieldId, same as a spreadsheet column referencing the one
 * to its left. A field whose formula throws (an input the operator hasn't
 * filled in yet, a genuine schema mistake) just resolves to `undefined` —
 * doesn't stop the fields after it from evaluating.
 */
export const computeCalcFieldValues = (
    fields: Field[],
    ctx: FormulaContext,
): Map<string, number | undefined> => {
    const computed = new Map<string, number | undefined>();
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
        if (field.Kind !== "Formula" || field.Calculated !== true) continue;
        if (FIXED_CALC_FIELD_IDS.includes(field.FieldId)) continue;
        try {
            computed.set(field.FieldId, toNumber(evaluateFormula(field.Formula, chainedCtx) as never));
        } catch {
            computed.set(field.FieldId, undefined);
        }
    }
    return computed;
};

/** Groups the same fields `computeCalcFieldValues` would evaluate into `"Intermediate"` (first) then `"Final"` (second) rows for CalcCard — a schema that never sets `Segment` still gets one sensible `"Final"` group instead of nothing rendering. Segments with no fields are omitted entirely. */
export const groupCalcFieldsBySegment = (
    fields: Field[],
    values: Map<string, number | undefined>,
): CalcSegment[] => {
    const bySegment: Record<"Intermediate" | "Final", CalcSegmentItem[]> = {
        Intermediate: [],
        Final: [],
    };
    for (const field of fields) {
        if (field.Kind !== "Formula" || field.Calculated !== true) continue;
        if (FIXED_CALC_FIELD_IDS.includes(field.FieldId)) continue;
        const segment = field.Group ?? "Final";
        bySegment[segment].push({ fieldId: field.FieldId, field, value: values.get(field.FieldId) });
    }
    return (["Intermediate", "Final"] as const)
        .map((segment) => ({ segment, items: bySegment[segment] }))
        .filter((group) => group.items.length > 0);
};
