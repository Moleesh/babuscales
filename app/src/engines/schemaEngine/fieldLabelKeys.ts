// Every built-in FieldId's i18n key (`strings.ts`/`ta.ts`) — the 9 fields
// `defaultTicketSchema.ts` ships carry no `Label` on their schema entry at
// all; their display text always comes from here instead, so it's
// translated the same way as the rest of the app's own chrome rather than
// duplicated per-field in the schema JSON. Lives in the engine (not
// Weighing's own `_private`) so both Weighing's rendering and Settings'
// admin field-schema table can share it without reaching into each other's
// private folders.
export const FIELD_LABEL_KEYS: Partial<Record<string, string>> = {
    VehicleNo: "weigh.vehicleNo",
    TicketDate: "weigh.ticketDate",
    Party: "weigh.party",
    Material: "weigh.material",
    Transporter: "weigh.transporter",
    ChallanNo: "weigh.challanNo",
    Gross: "weigh.gross",
    Tare: "weigh.tare",
    Net: "weigh.net",
    Charge: "weigh.charge",
};

// Task: "labels in the json we dont need it ... We use the field id and map
// it to a constant prefix ... weighing.label.FieldId, yes if the label is
// not present just show the fieldid" — a schema no longer needs to carry a
// `Label` for a custom field at all. The 9 built-ins above still resolve
// through their own existing app-chrome keys first (already require no
// schema `Label`, unchanged); anything else tries this fixed i18n-key
// prefix + FieldId next, so a site's language pack (ta.ts, or an uploaded
// one) can translate a custom field by adding e.g.
// `"weighing.label.BuyerRef"` without touching the schema JSON at all. Only
// a FieldId with no entry anywhere falls all the way back to its own raw
// text.
export const FIELD_LABEL_PREFIX = "weighing.label.";

/**
 * The one label-resolution chain every consumer (TicketFieldsCard's fixed
 * rows, CalcCard's capture boxes, SchemaFieldRow's generic custom fields,
 * Settings' FieldSchemaCard table) should use instead of repeating its own
 * `field.Label ? … : …` fallback inline: an explicit schema `Label` still
 * wins when a site sets one, then the built-in's own app-chrome key
 * (`FIELD_LABEL_KEYS`), then this FieldId's `weighing.label.` entry, and
 * finally the bare FieldId itself. `t` already falls back to the key it was
 * given when nothing matches (`I18nContextValue.t`'s own doc comment) — that
 * fallback-equals-key check is what tells this apart from "there is a real
 * translation" without needing a second lookup API.
 */
export const resolveFieldIdLabel = (
    fieldId: string,
    t: (key: string) => string,
): string => {
    const builtinKey = FIELD_LABEL_KEYS[fieldId];
    if (builtinKey) return t(builtinKey);
    const key = FIELD_LABEL_PREFIX + fieldId;
    const translated = t(key);
    return translated === key ? fieldId : translated;
};

// Mirrors the `weighing.label.<FieldId>` convention above for placeholder
// text (task: "we should be able to have a placeholder field. The
// placeholder key will be a field ID because the placeholder will be mapped
// with the labels") — but with no raw-FieldId fallback: an input with no
// placeholder configured should just show no placeholder, not its own
// FieldId as filler text.
export const PLACEHOLDER_PREFIX = "weighing.placeholder.";

/** `weighing.placeholder.<FieldId>` if a language pack defines one, otherwise `undefined` (no placeholder at all). */
export const resolvePlaceholder = (
    fieldId: string,
    t: (key: string) => string,
): string | undefined => {
    const key = PLACEHOLDER_PREFIX + fieldId;
    const translated = t(key);
    return translated === key ? undefined : translated;
};
