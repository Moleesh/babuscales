import type { JsonRecord, MasterKind } from "@db/types";
import type { Localized } from "@i18n/types";

// The field type system. A site's ticket/invoice fields are
// data, not code: this is the shape that data takes. `FieldBase` carries
// everything every field kind shares; the union below adds what only one
// kind needs.
export type FieldKind =
    | "Text"
    | "Number"
    | "Weight"
    | "Money"
    | "Date"
    | "DateTime"
    | "TicketDate"
    | "Boolean"
    | "Search"
    | "Select"
    | "Formula"
    | "Sequence"
    | "Media"
    | "Note";

export type ValidationSeverity = "Block" | "Warn" | "Note";

export interface ValidationRule {
    /** A formula evaluating to a boolean — true means the rule passed. */
    Formula: string;
    Severity: ValidationSeverity;
    Message: Localized;
}

export interface FieldBase {
    FieldId: string;
    /** Optional — the built-in fields (VehicleNo/Party/Material/Transporter/ChallanNo/Gross/Tare/Net/Charge) have no Label here at all and resolve their display text from this app's own i18n strings by FieldId instead (see `ticketFieldIds.ts`'s `resolveFieldLabel`); only a genuinely custom field an admin adds needs to supply one. */
    Label?: Localized | undefined;
    Help?: Localized | undefined;
    /** Defaults to visible when omitted. */
    Visible?: boolean | undefined;
    /** Defaults to not-required when omitted. */
    Required?: boolean | undefined;
    /** Defaults to editable when omitted. */
    ReadOnly?: boolean | undefined;
    Validate?: ValidationRule[] | undefined;
    /**
     * @deprecated Unused — a field's own `FieldSegment.Kind` is authoritative
     * now (task: "we dont need Calculated: true, Kind: Calculated in
     * segment should do the trick"): every field in a `"Calculated"` segment
     * renders in CalcCard, every field in an `"Enterable"` one renders as a
     * generic Ticket field row, no per-field flag needed. Still accepted by
     * `schemaJson.ts` so an older saved schema round-trips without erroring,
     * but no longer read anywhere (see `getCalculatedFieldIds` below).
     */
    Calculated?: boolean | undefined;
    /** Only meaningful for a field inside a `"Calculated"` segment that mirrors one of CalcCard's two physical-capture boxes rather than a derived one (e.g. Net's Formula) — which capture type it stands for. */
    Captured?: "Gross" | "Tare" | undefined;
    /** Only meaningful on a `Captured` field (Gross/Tare) — lets this specific box accept a typed weight instead of only a physical/indicator capture, independent of the app-wide Settings → Weighing → Rules.ManualEntry toggle (task: "for manual, we will add a manual flag 'Manual': true, this will work for manual entry"). Either the global setting or this flag being on is enough to show the typed-entry box. */
    Manual?: boolean | undefined;
    /**
     * @deprecated Unused since `FieldSegment.Kind` — a `Formula` field's own
     * `FieldSegment` (e.g. a Godown schema's "Weighment Calculations" vs.
     * "Godown Settlement", two separate `"Calculated"` segments/cards now)
     * is what used to be expressed here as `"Intermediate"`/`"Final"`.
     * Still accepted by `schemaJson.ts` so an older saved schema round-trips
     * without erroring, but no longer read by CalcCard.
     */
    Group?: "Intermediate" | "Final" | undefined;
}

export interface TextField extends FieldBase {
    Kind: "Text";
    Upper?: boolean | undefined;
    MaxLength?: number | undefined;
}
export interface NumberField extends FieldBase {
    Kind: "Number";
}
export interface WeightField extends FieldBase {
    Kind: "Weight";
}
export interface MoneyField extends FieldBase {
    Kind: "Money";
}
export interface DateField extends FieldBase {
    Kind: "Date";
}
export interface DateTimeField extends FieldBase {
    Kind: "DateTime";
}
/** The one ticket-date stamp — always read-only, always the moment of the
 * most recent Save (see `useWeighingTicket.ts`'s `saveTicket`), never a live
 * clock. A dedicated Kind rather than the old `Kind: "Date"` + `ReadOnly:
 * true` convention (task: "I think the kind for that should be ticket date,
 * like how we have for tare and gross") — clean break, no back-compat
 * inference for an older schema still using the old convention. */
export interface TicketDateField extends FieldBase {
    Kind: "TicketDate";
}
export interface BooleanField extends FieldBase {
    Kind: "Boolean";
}
export interface AutofillLink {
    /** The target FieldId to write into — a `Search` field's own `Autofills`
     * list, not the target's own schema entry, is what everyone reads
     * (task: "won't source be better? ... if its target we need to iterate
     * over all fields to find its parent" — a target-side flag would need
     * scanning every field to find which Search field feeds it; source-side
     * means the Search field already knows its own targets). */
    Field: string;
    /** Which column of the selected master row's `Body` to copy. */
    Column: string;
}
export interface SearchField extends FieldBase {
    Kind: "Search";
    Master: MasterKind;
    /**
     * Fields to copy a value into the instant the operator picks a master
     * row here — not a lasting link: the target field stays fully editable
     * afterwards, this only ever fires once, at selection time (task: "we
     * won't be disabling it ... it is just autofilled for that particular
     * second"). Can list more than one target (e.g. Material selection
     * autofilling both a Rate and a per-bag weight).
     */
    Autofills?: AutofillLink[] | undefined;
}
export interface SelectOption {
    Value: string;
    Label: Localized;
}
export interface SelectField extends FieldBase {
    Kind: "Select";
    Options: SelectOption[];
}
export interface FormulaField extends FieldBase {
    Kind: "Formula";
    Formula: string;
}
export interface SequenceField extends FieldBase {
    Kind: "Sequence";
    ResetPolicy: "Manual" | "Yearly";
}
export interface MediaField extends FieldBase {
    Kind: "Media";
}
export interface NoteField extends FieldBase {
    Kind: "Note";
}

export type Field =
    | TextField
    | NumberField
    | WeightField
    | MoneyField
    | DateField
    | DateTimeField
    | TicketDateField
    | BooleanField
    | SearchField
    | SelectField
    | FormulaField
    | SequenceField
    | MediaField
    | NoteField;

// The columns a master record of a given MasterKind carries beyond its
// built-in `Name` (db/types.ts's `MasterRow.Name`/`Body: JsonRecord`) —
// deliberately a narrower kind set than `FieldKind` above: no Search
// (a master doesn't reference another master), Formula/Sequence (nothing
// evaluates a master row standing alone), Weight/Media (not needed yet).
// Drives both the Masters screen's add/edit form and its list columns
// (masterColumns.tsx/MasterFormFields.tsx), replacing what used to be a
// handful of hardcoded per-kind fields (Material's Rate, Party's
// Email/Phone, everyone's Notes) — those three now ship as this schema's
// own default `Masters` config instead of being baked into the UI.
export type MasterColumnKind = "Text" | "Number" | "Money" | "Boolean" | "Select" | "Note";

export interface MasterColumn {
    FieldId: string;
    /** Optional, same fallback as `FieldBase.Label` — falls back to `masterColumnLabelKeys.ts`'s per-FieldId i18n key, then the raw FieldId. */
    Label?: Localized | undefined;
    Kind: MasterColumnKind;
    /** Defaults to not-required when omitted. */
    Required?: boolean | undefined;
    /** Only meaningful when `Kind` is `"Select"`. */
    Options?: SelectOption[] | undefined;
}

export interface MasterSchema {
    Kind: MasterKind;
    Columns: MasterColumn[];
    /**
     * Task: "when a ticket is saved and a field tied to a Master has a value
     * that doesn't yet exist in that Master's data, automatically save it as
     * a new entry" — scoped to the Master itself (not the field schema),
     * because the same Master can be reached from several fields/screens.
     * Omitted/`undefined` means "on", matching this app's pre-existing
     * behavior (`upsertTypedMasters.ts` has always auto-saved a typed
     * Vehicle/Party/Material/Transporter unconditionally); set `false` to
     * turn that off for just this Master.
     *
     * Named `AutoAddOnUse`, not `AutoSaveOnUse` (task: "AutoSaveOnUse/
     * HideAutoSavedFromList key is badly named") — this creates a brand-new
     * row the first time a value is used, it doesn't "save" anything that
     * already exists; "Add" is what actually happens.
     */
    AutoAddOnUse?: boolean | undefined;
    /**
     * Only meaningful when `AutoAddOnUse` isn't `false`. When on, a
     * ticket-save-triggered auto-add is marked (`MasterRow.Body.AutoAdded`)
     * and left out of the Masters admin screen's own browse/search list
     * (`useMasterListPage.ts`) — still a real row, still an exact-name match
     * for autofill/dedup (`upsertTypedMasters.ts`'s own `cache.rows` check,
     * `useMasterCache` search) — until an admin opens it directly and saves
     * it again, which clears the marker (`useMasterFormActions.ts`).
     * Defaults to off (unset), so an existing Master's list keeps showing
     * every row exactly as it does today.
     *
     * Named `HideAutoAddedFromList`, not `HideAutoSavedFromList` — same
     * rename reasoning as `AutoAddOnUse` above.
     */
    HideAutoAddedFromList?: boolean | undefined;
}

// One named group of fields — WeighingLeftColumn.tsx renders one card per
// segment, in schema order, so a schema can declare as many titled cards as
// it wants (task: Godown's 2 enterable "top" cards + 2 calculated "bottom"
// cards). `Kind` picks which card shape it gets: `"Enterable"` →
// TicketFieldsCard's generic field-grid loop, `"Calculated"` → CalcCard's
// box grid + calc-chain rows. Omitted `Kind` infers from content (any field
// with `Calculated: true` makes it `"Calculated"`, otherwise `"Enterable"`)
// so an older schema saved before this existed (just `"CurrentTicket"`/
// `"CapturedCalculated"`) still renders exactly as it did. `Label` is
// optional — a segment named `"CurrentTicket"`/`"CapturedCalculated"` with
// no Label still falls back to this app's own `weigh.ticket`/
// `weigh.capturedAndCalculated` i18n strings; any other Segment name with no
// Label just displays its raw Segment string as the card title.
export interface FieldSegment {
    Segment: string;
    Label?: Localized | undefined;
    /** Defaults to inferred from `Fields` (see above) when omitted. */
    Kind?: "Enterable" | "Calculated" | undefined;
    Fields: Field[];
}

// Extends `JsonRecord` (same reason `LanguagePack` does, i18n/types.ts) — a
// schema is saved as a `config` row's `Body` verbatim (ConfigKind:
// "Schema", db/schema.ts), and uploaded as a file the same way a language
// pack is.
export interface Schema extends JsonRecord {
    SchemaId: string;
    Segments: FieldSegment[];
    /** Which extra columns each MasterKind's records carry. Optional — a schema with no `Masters` block means every kind has just its built-in Name, same as before this existed. */
    Masters?: MasterSchema[] | undefined;
    /**
     * Whether a fractional value is accepted anywhere this schema governs a
     * decimal-string quantity: a ticket's `Charge`, any `Money`-kind
     * `MasterColumn`, a ticket `Capture.WeightKg`, and a `StoredTare`
     * master's `WeightKg` — one flag for both money and weight, since most
     * sites are consistently integer-only (or consistently not) across both.
     * Omitted/`false` (the common case) means every one of those rejects a
     * non-integer value at entry; `true` lets a plain decimal literal
     * through unchanged. Purely an input-validation gate — `computeValue`,
     * `getMaterialRate`, `buildMasterBody` and weight-derivation never branch
     * on this, they already handle either scale correctly. Lives on the
     * schema (not app Settings) because it's schema-editing surface
     * (FieldSchemaCard.tsx), same as `Masters` above.
     */
    DecimalsAllowed?: boolean | undefined;
}

/** Every field across every segment, flattened back into schema order — the shape almost every consumer beyond the schema editor itself actually wants (TicketFieldsCard's field loop, CalcCard's calc-chain, validation, master upload's field count). */
export const getAllFields = (schema: Schema): Field[] => schema.Segments.flatMap((seg) => seg.Fields);

export const SEGMENT_CURRENT_TICKET = "CurrentTicket";
export const SEGMENT_CAPTURED_CALCULATED = "CapturedCalculated";

/** `FieldSegment.Kind`, falling back to inferring it from content for a segment saved before `Kind` existed — see `FieldSegment`'s own comment. */
export const resolveSegmentKind = (segment: FieldSegment): "Enterable" | "Calculated" =>
    segment.Kind ?? (segment.Fields.some((field) => field.Calculated === true) ? "Calculated" : "Enterable");

/** Every FieldId belonging to a `"Calculated"` segment, across the whole schema — the schema-wide replacement for the old per-field `Calculated: true` flag (task: "Kind: Calculated, in segment should do the trick"). Only needed by consumers that operate over `getAllFields(schema)` rather than one segment's own `Fields`; a segment-scoped consumer (TicketFieldsCard, CalcCard) can rely on the segment's own Kind instead — an Enterable segment can never contain a calculated field under this model. */
export const getCalculatedFieldIds = (schema: Schema): Set<string> => {
    const ids = new Set<string>();
    for (const segment of schema.Segments) {
        if (resolveSegmentKind(segment) !== "Calculated") continue;
        for (const field of segment.Fields) ids.add(field.FieldId);
    }
    return ids;
};
