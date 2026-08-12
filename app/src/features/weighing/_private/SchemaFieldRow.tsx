import { Field } from "@components/Field";
import { SearchableDropdown } from "@components/SearchableDropdown";
import type { MasterKind } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";
import { evaluateFormula } from "@engines/formulaEngine";
import type { FormulaContext } from "@engines/formulaEngine";
import { toDecimalString } from "@engines/formulaEngine/Decimal";
import { evaluateGate } from "@engines/schemaEngine";
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
}

interface KindInputProps {
    id: string;
    value: CustomFieldValue;
    onChange: (value: CustomFieldValue) => void;
    readOnly: boolean;
    lang: string;
}

const TextInput = ({ id, field, value, onChange, readOnly }: KindInputProps & { field: Extract<SchemaField, { Kind: "Text" }> }) => (
    <input
        id={id}
        value={typeof value === "string" ? value : ""}
        maxLength={field.MaxLength}
        readOnly={readOnly}
        onChange={(e) => onChange(field.Upper ? e.target.value.toUpperCase() : e.target.value)}
    />
);

const NumberInput = ({ id, value, onChange, readOnly }: KindInputProps) => (
    <input
        id={id}
        type="number"
        value={typeof value === "number" ? value : ""}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
);

const DateInput = ({ id, value, onChange, readOnly }: KindInputProps) => (
    <input
        id={id}
        type="date"
        value={typeof value === "string" ? value : ""}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
    />
);

const DateTimeInput = ({ id, value, onChange, readOnly }: KindInputProps) => (
    <input
        id={id}
        type="datetime-local"
        value={typeof value === "string" ? value : ""}
        readOnly={readOnly}
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
    <select
        id={id}
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
    >
        <option value="" />
        {field.Options.map((option) => (
            <option key={option.Value} value={option.Value}>
                {resolveLocalized(option.Label, lang)}
            </option>
        ))}
    </select>
);

const SearchInput = ({
    id,
    field,
    value,
    onChange,
    readOnly,
    masterCaches,
}: KindInputProps & {
    field: Extract<SchemaField, { Kind: "Search" }>;
    masterCaches: Partial<Record<MasterKind, UseMasterCache>>;
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
            onChange={onChange}
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
}

// Dispatches on `field.Kind` to the right native control, delegating each
// kind's own markup to a small component above — keeps this switch itself
// short and flat rather than growing one long function's cognitive
// complexity/line count with every branch's JSX inline.
const FieldInput = ({ field, value, onChange, ctx, readOnly, masterCaches, lang }: FieldInputProps) => {
    const id = `fCustom_${field.FieldId}`;
    const common = { id, value, onChange, readOnly, lang };

    switch (field.Kind) {
        case "Text":
            return <TextInput {...common} field={field} />;
        case "Number":
        case "Weight":
        case "Money":
            return <NumberInput {...common} />;
        case "Date":
            return <DateInput {...common} />;
        case "DateTime":
            return <DateTimeInput {...common} />;
        case "Boolean":
            return <BooleanInput {...common} />;
        case "Select":
            return <SelectInput {...common} field={field} />;
        case "Search":
            return <SearchInput {...common} field={field} masterCaches={masterCaches} />;
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
// of the 5 fixed ticket fields (PLAN §8) — evaluates its gates against
// `ctx`, renders the right control for its Kind, and surfaces its
// Validate rules inline. Read TicketFieldsCard.tsx for how this plugs in.
export const SchemaFieldRow = ({ field, value, onChange, ctx, readOnly, masterCaches }: SchemaFieldRowProps) => {
    const { lang } = useTranslation();

    if (!evaluateFieldVisible(field, ctx)) return null;

    let required = false;
    let fieldReadOnly = readOnly;
    try {
        required = evaluateGate(field.RequiredWhen, ctx);
    } catch {
        required = false;
    }
    try {
        fieldReadOnly = readOnly || evaluateGate(field.ReadOnlyWhen, ctx);
    } catch {
        fieldReadOnly = readOnly;
    }

    const failing = failingValidationRules(field.Validate, ctx);

    return (
        <Field id={`fCustom_${field.FieldId}`} label={field.Label}>
            <FieldInput
                field={field}
                value={value}
                onChange={onChange}
                ctx={ctx}
                readOnly={fieldReadOnly}
                masterCaches={masterCaches}
                lang={lang}
            />
            {required && value === null && <p className={styles.fieldWarn}>Required.</p>}
            <ValidationMessages rules={failing} lang={lang} />
        </Field>
    );
};
