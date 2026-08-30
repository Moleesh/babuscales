// Every built-in FieldId's i18n key (`strings.ts`/`ta.ts`) — the 9 fields
// `defaultTicketSchema.ts` ships carry no `Label` on their schema entry at
// all; their display text always comes from here instead, so it's
// translated the same way as the rest of the app's own chrome rather than
// duplicated per-field in the schema JSON. Lives in the engine (not
// Weighing's own `_private`) so both Weighing's rendering and Settings'
// admin field-schema table can share it without reaching into each other's
// private folders.
export const FIELD_LABEL_KEYS: Partial<Record<string, string>> = {
    VehicleNo: "weigh.label.vehicleNo",
    TicketDate: "weigh.label.ticketDate",
    Party: "weigh.label.party",
    Material: "weigh.label.material",
    Transporter: "weigh.label.transporter",
    ChallanNo: "weigh.label.challanNo",
    Gross: "weigh.label.gross",
    Tare: "weigh.label.tare",
    Net: "weigh.label.net",
    Charge: "weigh.label.charge",
};

// Task: "labels in the json we dont need it ... We use the field id and map
// it to a constant prefix ... weigh.label.FieldId, yes if the label is
// not present just show the fieldid" — a schema no longer needs to carry a
// `Label` for a custom field at all. The 9 built-ins above still resolve
// through their own existing app-chrome keys first (already require no
// schema `Label`, unchanged); anything else tries this fixed i18n-key
// prefix + FieldId next, so a site's language pack (ta.ts, or an uploaded
// one) can translate a custom field by adding e.g.
// `"weigh.label.BuyerRef"` without touching the schema JSON at all. Only
// a FieldId with no entry anywhere falls all the way back to its own raw
// text.
export const FIELD_LABEL_PREFIX = "weigh.label.";

/**
 * The one label-resolution chain every consumer (TicketFieldsCard's fixed
 * rows, CalcCard's capture boxes, SchemaFieldRow's generic custom fields,
 * Settings' FieldSchemaCard table) should use instead of repeating its own
 * `field.Label ? … : …` fallback inline: an explicit schema `Label` still
 * wins when a site sets one, then the built-in's own app-chrome key
 * (`FIELD_LABEL_KEYS`), then this FieldId's `weigh.label.` entry, and
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

/**
 * The one call every consumer that renders a field's display label should
 * use instead of hand-rolling `field.Label ? resolveLocalized(field.Label,
 * lang) : resolveFieldIdLabel(...)` inline. Bug: "its still not fixed, i
 * think the problem is here" — that inline fork treated "this field has ANY
 * inline Label" as reason enough to skip the pack lookup entirely, so a
 * legacy schema-persisted English-only `Label` (no `ta` entry) silently
 * shadowed a real `weigh.label.<FieldId>` translation that was added to the
 * pack later: `resolveLocalized`'s own fallback-to-`.en` ran before this
 * function ever got a chance to consult the pack. Only trust `field.Label`
 * for the *specific* language being rendered — anything it doesn't cover
 * falls through to the pack the same as a field with no inline Label at all.
 */
export const resolveFieldLabel = (
    field: { FieldId: string; Label?: Record<string, string> | undefined },
    lang: string,
    t: (key: string) => string,
): string => {
    const explicit = field.Label?.[lang];
    if (explicit) return explicit;
    return resolveFieldIdLabel(field.FieldId, t);
};

// Mirrors the `weigh.label.<FieldId>` convention above for placeholder
// text (task: "we should be able to have a placeholder field. The
// placeholder key will be a field ID because the placeholder will be mapped
// with the labels") — but with no raw-FieldId fallback: an input with no
// placeholder configured should just show no placeholder, not its own
// FieldId as filler text.
export const PLACEHOLDER_PREFIX = "weigh.placeholder.";

/** `weigh.placeholder.<FieldId>` if a language pack defines one, otherwise `undefined` (no placeholder at all). */
export const resolvePlaceholder = (
    fieldId: string,
    t: (key: string) => string,
): string | undefined => {
    const key = PLACEHOLDER_PREFIX + fieldId;
    const translated = t(key);
    return translated === key ? undefined : translated;
};
