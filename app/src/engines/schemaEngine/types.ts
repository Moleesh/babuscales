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
    Label: Localized;
    Help?: Localized;
    /** Backed by an expression index — PLAN §6.3. */
    Indexed?: boolean;
    VisibleWhen?: string;
    RequiredWhen?: string;
    ReadOnlyWhen?: string;
    Validate?: ValidationRule[];
    /** Requires the admin session to be unlocked to change — PLAN §12. */
    Protected?: boolean;
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
