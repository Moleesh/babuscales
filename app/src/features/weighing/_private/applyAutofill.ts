import type { MasterRow } from "@db/types";
import type { Field } from "@engines/schemaEngine";

// A Search field's own `Autofills` list applied the instant a master row is
// picked (task: "when I enter a material ... the field for rates should
// auto-populate ... it is just autofilled for that particular second when
// they select the right value ... we won't be disabling it"). Non-
// destructive by design: this just writes a starting value the operator can
// still edit afterward, same as any other setCustomField call — nothing
// here re-runs on every render, only at selection time.
export const applyAutofill = (
    field: Field,
    row: MasterRow,
    setCustomField: (fieldId: string, value: string | number | boolean | null) => void,
): void => {
    if (field.Kind !== "Search" || !field.Autofills?.length) return;
    for (const link of field.Autofills) {
        const raw = row.Body[link.Column];
        if (raw === undefined) continue;
        if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" || raw === null) {
            setCustomField(link.Field, raw);
        }
    }
};
