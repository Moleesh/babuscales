import type { MouseEvent } from "react";

import { DatePicker } from "@components/DatePicker";
import { Field } from "@components/Field";
import { SearchableDropdown } from "@components/SearchableDropdown";
import { Select } from "@components/Select";
import type { MasterKind, MasterRow } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";
import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext } from "@engines/formulaEngine";
import { toDecimalString } from "@engines/formulaEngine/Decimal";
import { resolveFieldLabel, resolvePlaceholder } from "@engines/schemaEngine";
import type { Field as SchemaField } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/WeighingScreen.module.css";
import type { CustomFieldValue } from "../useWeighingTicket";
import { evaluateFieldVisible, failingValidationRules } from "./schemaFieldValidation";

export interface SchemaFieldRowProps {
    field: SchemaField;
    value: CustomFieldValue;
    onChange: (value: CustomFieldValue) => void;
    ctx: FormulaContext;
    readOnly: boolean;
    /** Only the master kinds already cached on this screen (Vehicle/Party/Material/Transporter) — see TicketFieldsCard's own comment on why this doesn't grow a new `useMasterCache` call per custom field. */
    masterCaches: Partial<Record<MasterKind, UseMasterCache>>;
    /** Fires with the newly-picked master row the instant a `Search` field's value changes — TicketFieldsCard wires this to `applyAutofill.ts` so a Search field's own `Autofills` list can copy values into other ticket fields. Optional: only `Search`-kind fields ever call it. */
    onAutofill?: (row: MasterRow) => void;
}

interface KindInputProps {
    id: string;
    value: CustomFieldValue;
    onChange: (value: CustomFieldValue) => void;
    readOnly: boolean;
    lang: string;
    t: (key: string) => string;
}

// `tabIndex={readOnly ? -1 : undefined}` on every plain-`<input readOnly>`
// control below — task: "i can still foxus on disanled fields". `readOnly`
// alone doesn't stop Tab from focusing an input the way `disabled` does.
// `onMouseDown` preventDefault alongside it — task: "focus on disable is
// still not fixed" — `tabIndex={-1}` only drops it from the Tab sequence; a
// `readOnly` input still accepts focus from a plain mouse click, which kept
// showing the orange `:focus` border on a locked field even without Tab
// ever reaching it (SearchableDropdown.tsx's own copy of this fix has the
// full reasoning).
const blockReadOnlyFocus = (readOnly: boolean) => (e: MouseEvent) => {
    if (readOnly) e.preventDefault();
};

// The three props above, bundled — TextInput/NumberInput/DateTimeInput below
// each spread this instead of repeating the same `readOnly`/`tabIndex`/
// `onMouseDown` triplet.
const readOnlyInputProps = (readOnly: boolean) => ({
    readOnly,
    tabIndex: readOnly ? -1 : undefined,
    onMouseDown: blockReadOnlyFocus(readOnly),
});

const TextInput = ({ id, field, value, onChange, readOnly, t }: KindInputProps & { field: Extract<SchemaField, { Kind: "Text" }> }) => (
    <input
        id={id}
        value={typeof value === "string" ? value : ""}
        maxLength={field.MaxLength}
        {...readOnlyInputProps(readOnly)}
        placeholder={resolvePlaceholder(field.FieldId, t)}
        onChange={(e) => onChange(field.Upper ? e.target.value.toUpperCase() : e.target.value)}
    />
);

const NumberInput = ({ id, field, value, onChange, readOnly, t }: KindInputProps & { field: SchemaField }) => (
    <input
        id={id}
        type="number"
        value={typeof value === "number" ? value : ""}
        {...readOnlyInputProps(readOnly)}
        placeholder={resolvePlaceholder(field.FieldId, t)}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
);

// `Kind: "Date"` custom fields store a plain "YYYY-MM-DD" string — exactly
// DatePicker's own value contract — so this swap is safe: nothing about
// the generic schema field-type system's storage shape changes, only which
// control renders it — replacing the OS-drawn native date popup, which
// the custom cursor follower can't reach. `Kind: "DateTime"` below is
// deliberately left as the native `<input type="datetime-local">` — its
// "YYYY-MM-DDTHH:mm" value has a time component DatePicker doesn't offer a
// row for yet (see this file's own DateTimeInput comment for the full
// reasoning), and a schema-driven field can't be selectively upgraded
// without also handling every already-saved DateTime value.
const DateInput = ({ id, value, onChange, readOnly }: KindInputProps) => (
    <DatePicker
        id={id}
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        onChange={onChange}
    />
);

// Left as the native control — no time row exists on DatePicker, decided
// rather than half-building a time picker under this pass. Swapping it would also mean
// reformatting/reparsing "YYYY-MM-DDTHH:mm" through a still-string value
// contract, which is more surface than this pass needs to touch.
const DateTimeInput = ({ id, value, onChange, readOnly }: KindInputProps) => (
    <input
        id={id}
        type="datetime-local"
        value={typeof value === "string" ? value : ""}
        {...readOnlyInputProps(readOnly)}
        onChange={(e) => onChange(e.target.value)}
    />
);

const BooleanInput = ({ id, value, onChange, readOnly }: KindInputProps) => (
    <input
        id={id}
        type="checkbox"
        checked={value === true}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.checked)}
    />
);

const SelectInput = ({
    id,
    field,
    value,
    onChange,
    readOnly,
    lang,
}: KindInputProps & { field: Extract<SchemaField, { Kind: "Select" }> }) => (
    <Select
        id={id}
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        options={[
            { value: "", label: "" },
            ...field.Options.map((option) => ({
                value: option.Value,
                label: resolveLocalized(option.Label, lang),
            })),
        ]}
        onChange={onChange}
    />
);

const SearchInput = ({
    id,
    field,
    value,
    onChange,
    readOnly,
    masterCaches,
    onAutofill,
}: KindInputProps & {
    field: Extract<SchemaField, { Kind: "Search" }>;
    masterCaches: Partial<Record<MasterKind, UseMasterCache>>;
    onAutofill?: (row: MasterRow) => void;
}) => {
    const cache = masterCaches[field.Master];
    // Defensive: shouldn't happen given TicketFieldsCard only wires the
    // four already-cached master kinds through, but a schema pointing at
    // any other MasterKind has nowhere to search — out of scope for this
    // pass (see TicketFieldsCard's own comment).
    if (!cache) return <p className={styles.fieldWarn}>Not yet supported for this master.</p>;
    return (
        <SearchableDropdown
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(nextValue) => {
                onChange(nextValue);
                if (!field.Autofills?.length) return;
                // Matched on `Name`, not `MasterId`: SearchableDropdown's
                // `pick()` (useDropdownState.ts) hands its wrapping
                // `onChange` the picked option's `Label` — the display
                // string this SearchInput builds as `row.Name` — not the
                // underlying master id.
                const row = cache.rows.find((candidate) => candidate.Name === nextValue);
                if (row) onAutofill?.(row);
            }}
            onSearch={(query) =>
                cache.search(query).map((row) => ({ Value: row.MasterId, Label: row.Name }))
            }
            readOnly={readOnly}
        />
    );
};

const formatFormulaValue = (result: ReturnType<typeof evaluateFormula>): string => {
    if (typeof result === "boolean") return String(result);
    if (typeof result === "string") return result;
    return toDecimalString(result);
};

const FormulaInput = ({
    id,
    field,
    ctx,
}: {
    id: string;
    field: Extract<SchemaField, { Kind: "Formula" }>;
    ctx: FormulaContext;
}) => {
    let display: string;
    try {
        display = formatFormulaValue(evaluateFormula(field.Formula, ctx));
    } catch {
        display = "(formula error)";
    }
    return <input id={id} value={display} readOnly disabled />;
};

interface FieldInputProps {
    field: SchemaField;
    value: CustomFieldValue;
    onChange: (value: CustomFieldValue) => void;
    ctx: FormulaContext;
    readOnly: boolean;
    masterCaches: Partial<Record<MasterKind, UseMasterCache>>;
    lang: string;
    t: (key: string) => string;
    onAutofill?: (row: MasterRow) => void;
}

// Dispatches on `field.Kind` to the right native control, delegating each
// kind's own markup to a small component above — keeps this switch itself
// short and flat rather than growing one long function's cognitive
// complexity/line count with every branch's JSX inline.
const FieldInput = ({ field, value, onChange, ctx, readOnly, masterCaches, lang, t, onAutofill }: FieldInputProps) => {
    const id = `fCustom_${field.FieldId}`;
    const common = { id, value, onChange, readOnly, lang, t };

    switch (field.Kind) {
        case "Text":
            return <TextInput {...common} field={field} />;
        case "Number":
        case "Weight":
        case "Money":
            return <NumberInput {...common} field={field} />;
        case "Date":
            return <DateInput {...common} />;
        case "DateTime":
            return <DateTimeInput {...common} />;
        case "TicketDate":
            // Never actually reached — TicketDate is always spliced in by
            // TicketFieldsCard's own dedicated read-only control, skipped
            // before it ever reaches this generic renderer. Only exists so
            // this switch stays exhaustive now that "TicketDate" is a Field
            // union member.
            return null;
        case "Boolean":
            return <BooleanInput {...common} />;
        case "Select":
            return <SelectInput {...common} field={field} />;
        case "Search":
            return <SearchInput {...common} field={field} masterCaches={masterCaches} onAutofill={onAutofill} />;
        case "Formula":
            return <FormulaInput id={id} field={field} ctx={ctx} />;
        case "Sequence":
        case "Media":
            // Real behaviour (numbering series storage / camera capture) is
            // out of scope for this pass — the Field chrome around this
            // still gives an admin who adds one of these some feedback,
            // not silent nothing.
            return <p className={styles.fieldWarn}>Not yet supported.</p>;
        case "Note":
            return field.Help ? <p className={styles.hint}>{resolveLocalized(field.Help, lang)}</p> : null;
        default: {
            const exhaustive: never = field;
            return exhaustive;
        }
    }
};

interface ValidationMessagesProps {
    rules: ReturnType<typeof failingValidationRules>;
    lang: string;
}

// Inline Block/Warn/Note text under a field — `Field` has no dedicated
// hint/error slot (checked Field.tsx), so this renders as a small paragraph
// right under the Field wrapper, styled by severity via WeighingScreen's
// own stylesheet (`.fieldError`/`.fieldWarn`).
const ValidationMessages = ({ rules, lang }: ValidationMessagesProps) => (
    <>
        {rules.map((rule, index) => (
            <p
                key={`${rule.Severity}_${index}`}
                className={rule.Severity === "Block" ? styles.fieldError : styles.fieldWarn}
            >
                {rule.Severity === "Note" ? "Note: " : ""}
                {resolveLocalized(rule.Message, lang)}
            </p>
        ))}
    </>
);

// The generic renderer for any Field from the active Schema that isn't one
// of the 5 fixed ticket fields — evaluates its gates against
// `ctx`, renders the right control for its Kind, and surfaces its
// Validate rules inline. Read TicketFieldsCard.tsx for how this plugs in.
export const SchemaFieldRow = ({ field, value, onChange, ctx, readOnly, masterCaches, onAutofill }: SchemaFieldRowProps) => {
    const { lang, t } = useTranslation();

    if (!evaluateFieldVisible(field)) return null;

    const required = field.Required === true;
    const fieldReadOnly = readOnly || field.ReadOnly === true;

    const failing = failingValidationRules(field.Validate, ctx);

    return (
        <Field id={`fCustom_${field.FieldId}`} label={resolveFieldLabel(field, lang, t)}>
            <FieldInput
                field={field}
                value={value}
                onChange={onChange}
                ctx={ctx}
                readOnly={fieldReadOnly}
                masterCaches={masterCaches}
                lang={lang}
                t={t}
                onAutofill={onAutofill}
            />
            {required && value === null && <p className={styles.fieldWarn}>Required.</p>}
            <ValidationMessages rules={failing} lang={lang} />
        </Field>
    );
};
