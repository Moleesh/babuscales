import type { Field } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";

// The 5 fixed ticket fields rendered by their own dedicated controls in
// TicketFieldsCard.tsx (still the hardware-shaped master-search/plain-text
// widgets, per "values not the button" — only their label/order/visibility
// come from the schema) — anything else in the active Schema's Fields is a
// custom field, rendered generically by SchemaFieldRow (PLAN §8). Its own
// small file (rather than living inside TicketFieldsCard.tsx, a component
// file) so importing it elsewhere — WeighingScreen's Save-blocking check —
// doesn't trip react-refresh's "only export components" rule.
export const FIXED_FIELD_IDS = ["VehicleNo", "Party", "Material", "Transporter", "ChallanNo"];

/** A `Calculated` field (`Field.Calculated`, e.g. the default schema's Gross/Tare/Net/Charge) belongs in CalcCard's "Captured & calculated" card, not the generic Ticket field loop — capture/formula logic stays exactly as-is (task: "the values not the button"), the schema entry only supplies that box's *label*. No fixed FieldId list: any field an admin flags `Calculated: true` routes here, so a custom calculated field works the same way without a code change. */
export const isCalculatedField = (field: Field): boolean => field.Calculated === true;

/** Looks up `fieldId`'s Label in the active Schema, falling back to `fallback` (usually a plain i18n string) when the schema has no such field — shared by TicketFieldsCard's fixed rows and CalcCard's capture boxes so both source their labels from the same JSON. */
export const resolveFieldLabel = (fields: Field[], fieldId: string, lang: string, fallback: string): string => {
    const field = fields.find((candidate) => candidate.FieldId === fieldId);
    return field ? resolveLocalized(field.Label, lang) : fallback;
};
