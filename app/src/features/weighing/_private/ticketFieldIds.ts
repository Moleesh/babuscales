import { resolveFieldLabel as resolveFieldLabelForField } from "@engines/schemaEngine";
import type { Field } from "@engines/schemaEngine";

// The 5 fixed ticket fields rendered by their own dedicated controls in
// TicketFieldsCard.tsx (still the hardware-shaped master-search/plain-text
// widgets, per "values not the button" — only their label/order/visibility
// come from the schema) — anything else in the active Schema's Fields is a
// custom field, rendered generically by SchemaFieldRow. Its own
// small file (rather than living inside TicketFieldsCard.tsx, a component
// file) so importing it elsewhere — WeighingScreen's Save-blocking check —
// doesn't trip react-refresh's "only export components" rule.
export const FIXED_FIELD_IDS = ["VehicleNo", "Party", "Material", "Transporter", "ChallanNo"];

/** A field belonging to a `"Calculated"` segment (e.g. the default schema's Gross/Tare/Net/Charge) belongs in CalcCard's "Captured & calculated" card, not the generic Ticket field loop — capture/formula logic stays exactly as-is, the schema entry only supplies that box's *label*. `calculatedIds` comes from `getCalculatedFieldIds(schema)` (schemaEngine/types.ts) — a field's own segment Kind is now the sole authority, no per-field flag. */
export const isCalculatedField = (field: Field, calculatedIds: Set<string>): boolean => calculatedIds.has(field.FieldId);

/** Looks up `fieldId`'s Label in the active Schema, falling back to the
 * shared `weigh.label.<FieldId>` i18n convention (`resolveFieldIdLabel`)
 * when the schema has no such field or that field carries no `Label` of its
 * own — shared by TicketFieldsCard's fixed rows and CalcCard's capture
 * boxes. Schema JSON no longer needs a `Label` per field at all (task:
 * "labels in the json we dont need it"). */
export const resolveFieldLabel = (
    fields: Field[],
    fieldId: string,
    lang: string,
    t: (key: string) => string,
): string => {
    const field = fields.find((candidate) => candidate.FieldId === fieldId);
    if (field) return resolveFieldLabelForField(field, lang, t);
    return resolveFieldLabelForField({ FieldId: fieldId }, lang, t);
};
