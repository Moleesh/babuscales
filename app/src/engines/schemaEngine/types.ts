import type { JsonRecord, MasterKind } from "@db/types";
import type { Localized } from "@i18n/types";

// The field type system — PLAN §8. A site's ticket/invoice fields are
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
    Label?: Localized;
    Help?: Localized;
    /** Defaults to visible when omitted. */
    Visible?: boolean;
    /** Defaults to not-required when omitted. */
    Required?: boolean;
    /** Defaults to editable when omitted. */
    ReadOnly?: boolean;
    Validate?: ValidationRule[];
    /** Renders in the Weighing screen's "Captured & calculated" card (CalcCard.tsx) instead of as a generic Ticket field row — the field supplies only its Label there; the box's own value/behavior is unchanged (task: "the values not the button"). */
    Calculated?: boolean;
    /** Only meaningful when `Calculated` is true and this field mirrors one of CalcCard's two physical-capture boxes rather than a derived one (e.g. Net's Formula) — which capture type it stands for. */
    Captured?: "Gross" | "Tare";
}

export interface TextField extends FieldBase {
    Kind: "Text";
    Upper?: boolean;
    MaxLength?: number;
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
export interface BooleanField extends FieldBase {
    Kind: "Boolean";
}
export interface SearchField extends FieldBase {
    Kind: "Search";
    Master: MasterKind;
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
    | BooleanField
    | SearchField
    | SelectField
    | FormulaField
    | SequenceField
    | MediaField
    | NoteField;

// Extends `JsonRecord` (same reason `LanguagePack` does, i18n/types.ts) — a
// schema is saved as a `config` row's `Body` verbatim (ConfigKind:
// "Schema", db/schema.ts), and uploaded as a file the same way a language
// pack is (task #50).
export interface Schema extends JsonRecord {
    SchemaId: string;
    /** "Ticket" | "Invoice" — matches DocKind, kept as a string so a future doc kind needs no engine change. */
    DocKind: string;
    Fields: Field[];
}
