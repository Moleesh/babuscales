import type { FormulaContext } from "@engines/formulaEngine";
import { evaluateGate } from "@engines/schemaEngine";
import type { Field, ValidationRule } from "@engines/schemaEngine";

// Pure gate/validation helpers shared between SchemaFieldRow's own
// rendering and WeighingScreen's Save-blocking check — kept in a
// non-component file so importing them doesn't trip react-refresh's "only
// export components" rule, and so the two call sites can never drift.

/** A broken VisibleWhen must never hide the whole form (or block Save) silently, but it also must not crash the screen — default to visible. */
export const evaluateFieldVisible = (field: Field, ctx: FormulaContext): boolean => {
    try {
        return evaluateGate(field.VisibleWhen, ctx);
    } catch {
        return true;
    }
};

/** A rule "passes" when its formula evaluates true — a *failing* rule is one whose gate comes back false. A broken rule formula is treated as "not failing" (silently inert) rather than crashing the screen or blocking Save on a schema authoring mistake this pass has no UI to surface. */
export const failingValidationRules = (
    rules: ValidationRule[] | undefined,
    ctx: FormulaContext,
): ValidationRule[] => {
    if (!rules) return [];
    return rules.filter((rule) => {
        try {
            return !evaluateGate(rule.Formula, ctx);
        } catch {
            return false;
        }
    });
};

/** Mirrors exactly the visible/Validate/Block check SchemaFieldRow runs per field, across a whole field list with no rendering — used by ActionsCard's Save-button gate (via WeighingScreen) so a Block-severity failure on a hidden field never blocks Save, same as it never shows a message for one. */
export const hasBlockingCustomFieldError = (fields: Field[], ctx: FormulaContext): boolean =>
    fields.some(
        (field) =>
            evaluateFieldVisible(field, ctx) &&
            failingValidationRules(field.Validate, ctx).some((rule) => rule.Severity === "Block"),
    );
