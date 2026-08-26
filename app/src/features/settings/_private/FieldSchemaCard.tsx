import { useState } from "react";

import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Select } from "@components/Select";
import { Tooltip } from "@components/Tooltip";
import { FIELD_LABEL_KEYS, FIELD_LABEL_PREFIX, getAllFields, resolveFieldLabel } from "@engines/schemaEngine";
import type { Field, Schema } from "@engines/schemaEngine";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/FieldsLanguagePane.module.css";
import { repairJson } from "./repairJson";

// Reserved preview-language codes, not real pack `Code`s — task: "add one
// more here ie) key and english". `PREVIEW_KEY_CODE` shows each row's raw
// i18n key untranslated (handy for spotting which key a label actually
// resolves to). Plain `"en"` doubles as the literal-English code: it's also
// what an "en" override pack (LanguageTableCard.tsx's `enPack`) would use,
// and `previewT`'s own fallback chain (FieldsLanguagePane.tsx) already
// lands on `EN_STRINGS` when no pack matches, so no override pack existing
// yet still resolves it correctly — only add it as its own option when
// nothing already provides that code.
export const PREVIEW_KEY_CODE = "__key__";

// No field needs a `Label` at all now (task: "labels in the json we dont
// need it") — same FieldId → `weigh.label.` i18n-key fallback the
// Weighing screen itself uses (`resolveFieldIdLabel`), so this table shows
// the same text an operator sees rather than a blank cell.
//
// "Key" preview mode ("not having keys / we need consistency" — a field
// with its own inline `Label` used to always show that literal text, even
// in Key mode, while every other row showed its i18n key) has to bypass
// `field.Label` entirely: an inline Label carries no key at all, so the
// only key-shaped thing to show is the same `weigh.label.<FieldId>`
// convention `resolveFieldIdLabel` falls back to for key-less fields.
const fieldLabel = (field: Field, lang: string, t: (key: string) => string): string => {
    if (lang === PREVIEW_KEY_CODE) return FIELD_LABEL_KEYS[field.FieldId] ?? FIELD_LABEL_PREFIX + field.FieldId;
    return resolveFieldLabel(field, lang, t);
};

interface VisibilityToggleArgs {
    field: Field;
    unlocked: boolean;
    schemaBusy: boolean;
    t: (key: string) => string;
    onToggleVisible: (fieldId: string) => void;
}

// One row's own show/hide button — lets an operator easily hide and show
// the field instead of changing them every time; flips that field's `Visible` on the active schema and
// re-saves it, the same effect as hand-editing and re-uploading the JSON.
// Every field in this table — Gross/Tare included — honors `Visible` the
// same way (CalcCard.tsx's `isBoxVisible`), so they all get the same
// Hide/Show toggle; no more "Always shown" exception now that hiding
// Gross/Tare here actually does something.
const VisibilityToggle = ({ field, unlocked, schemaBusy, t, onToggleVisible }: VisibilityToggleArgs) => {
    const visible = field.Visible !== false;
    return (
        <button
            type="button"
            className={`${styles.visibilityToggle} ${visible ? "" : styles.visibilityOff}`}
            disabled={!unlocked || schemaBusy}
            onClick={() => onToggleVisible(field.FieldId)}
        >
            {visible ? t("settings.fieldSchema.hide") : t("settings.fieldSchema.show")}
        </button>
    );
};

interface FieldColumnsArgs {
    lang: string;
    t: (key: string) => string;
    labelT: (key: string) => string;
    unlocked: boolean;
    schemaBusy: boolean;
    onToggleVisible: (fieldId: string) => void;
}

const fieldColumns = ({
    lang,
    t,
    labelT,
    unlocked,
    schemaBusy,
    onToggleVisible,
}: FieldColumnsArgs): DataTableColumn<Field>[] => [
    { key: "id", header: t("settings.fieldSchema.col.field"), render: (field) => field.FieldId },
    { key: "kind", header: t("settings.fieldSchema.col.kind"), render: (field) => field.Kind },
    {
        key: "label",
        header: t("settings.fieldSchema.col.label"),
        // A Formula field's own expression shown under its label — the
        // table has no separate "Formula" column, so this stays the
        // least-disruptive spot for it (task: "show a field's Formula
        // string in the Fields & language table when Kind is Formula").
        render: (field) => (
            <>
                {fieldLabel(field, lang, labelT)}
                {field.Kind === "Formula" && field.Formula && (
                    // Task: "if the formula is big truncate it ... truncate
                    // should follow the tooltip that we implement not the
                    // generic one" — themed Tooltip (components/Tooltip)
                    // instead of a native `title` attribute, same as every
                    // other truncated-text tooltip in the app.
                    <Tooltip label={field.Formula} style={{ display: "block", minWidth: 0 }}>
                        <div className={styles.formula}>{field.Formula}</div>
                    </Tooltip>
                )}
            </>
        ),
    },
    {
        key: "visible",
        header: t("settings.fieldSchema.col.visible"),
        render: (field) => (
            <VisibilityToggle
                field={field}
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                t={t}
                onToggleVisible={onToggleVisible}
            />
        ),
    },
];

export interface FieldSchemaCardProps {
    ticketSchema: Schema;
    /** Every saved schema (built-in default + every upload) — lets you keep multiple uploads and pick from a dropdown. */
    schemas: Schema[];
    /** The pack code the Label column resolves against — always the app's own active runtime language now (FieldsLanguagePane.tsx's `lang`); the picker that used to let this diverge is read-only, see PreviewLangSelect. */
    lang: string;
    /** Resolves a `weigh.label.<FieldId>` (or built-in) key against `lang` specifically — a pack-scoped `t`, distinct from the ambient `useTranslation().t` used everywhere else in this card, so the table renders labels in the same language `lang` resolves to. */
    labelT: (key: string) => string;
    /** Every installed pack (English + every upload), shown in the (now read-only) preview-language indicator below the schema picker. */
    previewPacks: LanguagePack[];
    unlocked: boolean;
    schemaBusy: boolean;
    schemaMessage: { text: string; bad: boolean } | null;
    onSchemaFile: (file: File) => void;
    /** Same parse/apply path as `onSchemaFile` — the "paste JSON" box next to the drop-zone, for a schema copied from elsewhere rather than saved as a file. */
    onSchemaText: (text: string) => void;
    onReset: () => void;
    onSelectActiveSchema: (schemaId: string) => void;
    onToggleFieldVisible: (fieldId: string) => void;
}

// Split out so FieldSchemaCard stays under the per-function line budget
// (docs/CodingStandards.md) — purely a layout extraction, no behavior change.
const SchemaDropZone = ({
    unlocked,
    schemaBusy,
    onSchemaFile,
    t,
}: {
    unlocked: boolean;
    schemaBusy: boolean;
    onSchemaFile: (file: File) => void;
    t: (key: string) => string;
}) => (
    <label className={`${styles.drop} ${!unlocked ? styles.dropDisabled : ""}`}>
        <span className={styles.dropIcon}>⬆</span>
        <span>
            {schemaBusy ? t("settings.fieldSchema.dropApplying") : t("settings.fieldSchema.dropPrompt")}
        </span>
        <input
            type="file"
            accept=".json,application/json"
            hidden
            disabled={schemaBusy || !unlocked}
            onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onSchemaFile(file);
            }}
        />
    </label>
);

interface PasteBoxActionsProps {
    unlocked: boolean;
    schemaBusy: boolean;
    text: string;
    t: (key: string) => string;
    onApply: () => void;
    onPrettify: () => void;
    onCancel: () => void;
}

// Split out of SchemaPasteBox (over the line budget — docs/CodingStandards.md)
// — Apply/Prettify/Cancel, all disabled the same way whenever there's
// nothing usable in the box yet.
const PasteBoxActions = ({ unlocked, schemaBusy, text, t, onApply, onPrettify, onCancel }: PasteBoxActionsProps) => (
    <div className={styles.pasteActions}>
        <button
            type="button"
            className={styles.resetButton}
            disabled={schemaBusy || !unlocked || !text.trim()}
            onClick={onApply}
        >
            {t("settings.fieldSchema.pasteApply")}
        </button>
        <button
            type="button"
            className={styles.pasteToggle}
            disabled={schemaBusy || !unlocked || !text.trim()}
            onClick={onPrettify}
        >
            {t("settings.fieldSchema.pastePrettify")}
        </button>
        <button type="button" className={styles.pasteToggle} onClick={onCancel}>
            {t("settings.fieldSchema.pasteCancel")}
        </button>
    </div>
);

interface PasteBoxFieldsProps {
    text: string;
    schemaBusy: boolean;
    unlocked: boolean;
    prettifyFailed: boolean;
    t: (key: string) => string;
    onChange: (text: string) => void;
}

// The textarea + its own inline error — split out of SchemaPasteBox purely
// to stay under the per-function line budget (docs/CodingStandards.md).
const PasteBoxFields = ({ text, schemaBusy, unlocked, prettifyFailed, t, onChange }: PasteBoxFieldsProps) => (
    <>
        <textarea
            className={styles.pasteInput}
            rows={16}
            placeholder={'{ "SchemaId": …, "Segments": […] }'}
            value={text}
            disabled={schemaBusy || !unlocked}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
        />
        {prettifyFailed && <p className={styles.bad}>{t("settings.fieldSchema.pastePrettifyFailed")}</p>}
    </>
);

// Reformats whatever's in the box with 2-space indent — the same shape the
// schemas this app hands out (resources/schemas/*.json) already use — so a
// minified or inconsistently-indented paste is easy to read/edit before
// hitting Apply. Tries the text as-is first, then falls back to a repaired
// version (trailing commas dropped, bare keys quoted) — leaves the text
// untouched (and flags the error) only if neither parses.
const prettifyJson = (text: string): string => {
    try {
        return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
        return JSON.stringify(JSON.parse(repairJson(text)), null, 2);
    }
};

interface PasteBoxOpenProps {
    unlocked: boolean;
    schemaBusy: boolean;
    onSchemaText: (text: string) => void;
    t: (key: string) => string;
    onClose: () => void;
}

// The expanded textarea + fields + actions — split out of SchemaPasteBox
// purely to stay under the per-function line budget (docs/CodingStandards.md).
const PasteBoxOpen = ({ unlocked, schemaBusy, onSchemaText, t, onClose }: PasteBoxOpenProps) => {
    const [text, setText] = useState("");
    const [prettifyFailed, setPrettifyFailed] = useState(false);
    return (
        <div className={styles.pasteBox}>
            <PasteBoxFields
                text={text}
                schemaBusy={schemaBusy}
                unlocked={unlocked}
                prettifyFailed={prettifyFailed}
                t={t}
                onChange={(value) => {
                    setText(value);
                    setPrettifyFailed(false);
                }}
            />
            <PasteBoxActions
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                text={text}
                t={t}
                onApply={() => {
                    onSchemaText(text);
                    onClose();
                }}
                onPrettify={() => {
                    try {
                        setText(prettifyJson(text));
                        setPrettifyFailed(false);
                    } catch {
                        setPrettifyFailed(true);
                    }
                }}
                onCancel={onClose}
            />
        </div>
    );
};

// A collapsed-by-default alternative to the drop-zone above — for a schema
// copied from a chat, an editor, or another site's Settings rather than
// saved as a `.json` file. Starts as a single link so it doesn't compete
// with the drop-zone for attention; clicking it swaps in a compact
// textarea + Apply, same width as the card.
const SchemaPasteBox = ({
    unlocked,
    schemaBusy,
    onSchemaText,
    t,
}: {
    unlocked: boolean;
    schemaBusy: boolean;
    onSchemaText: (text: string) => void;
    t: (key: string) => string;
}) => {
    const [open, setOpen] = useState(false);
    if (!open) {
        return (
            <button
                type="button"
                className={styles.pasteToggle}
                disabled={!unlocked}
                onClick={() => setOpen(true)}
            >
                {t("settings.fieldSchema.pasteInstead")}
            </button>
        );
    }
    return (
        <PasteBoxOpen
            unlocked={unlocked}
            schemaBusy={schemaBusy}
            onSchemaText={onSchemaText}
            t={t}
            onClose={() => setOpen(false)}
        />
    );
};

// The "which saved schema is active" picker — every upload keeps its own
// row (db/schema.ts's `ticketSchemaConfigId`, keyed by SchemaId), so
// switching here never touches a saved schema, only which one renders.
const ActiveSchemaSelect = ({
    ticketSchema,
    schemas,
    unlocked,
    schemaBusy,
    onSelectActiveSchema,
    t,
}: {
    ticketSchema: Schema;
    schemas: Schema[];
    unlocked: boolean;
    schemaBusy: boolean;
    onSelectActiveSchema: (schemaId: string) => void;
    t: (key: string) => string;
}) => (
    <div className={styles.activeSchemaRow}>
        <span className="lbl">{t("settings.fieldSchema.activeLabel")}</span>
        <Select
            value={ticketSchema.SchemaId}
            options={schemas.map((schema) => ({ value: schema.SchemaId, label: schema.SchemaId }))}
            disabled={!unlocked || schemaBusy}
            onChange={onSelectActiveSchema}
        />
    </div>
);

// The Label column's preview-language indicator — used to be a real picker
// (an admin could preview e.g. Tamil labels without switching the whole
// running app); task "Preview labels in should auto select the language
// curreclt used nad should be disabled" → "should not allow the dropdown to
// be selcted atall" turned it read-only: it always shows the app's own
// active `lang` and is unconditionally disabled, admin or not — `unlocked`
// no longer has any say here.
const PreviewLangSelect = ({
    lang,
    previewPacks,
    t,
}: {
    lang: string;
    previewPacks: LanguagePack[];
    t: (key: string) => string;
}) => {
    const options = [
        { value: PREVIEW_KEY_CODE, label: t("settings.fieldSchema.previewKey") },
        ...(previewPacks.some((pack) => pack.Code === "en")
            ? []
            : [{ value: "en", label: t("settings.fieldSchema.previewEnglish") }]),
        ...previewPacks.map((pack) => ({ value: pack.Code, label: pack.Name })),
    ];
    return (
        <div className={styles.activeSchemaRow}>
            <span className="lbl">{t("settings.fieldSchema.previewLangLabel")}</span>
            <Select value={lang} options={options} disabled={true} onChange={() => {}} />
        </div>
    );
};

interface PickerRowsProps {
    ticketSchema: Schema;
    schemas: Schema[];
    lang: string;
    previewPacks: LanguagePack[];
    unlocked: boolean;
    schemaBusy: boolean;
    onSelectActiveSchema: (schemaId: string) => void;
    t: (key: string) => string;
}

// The two dropdown rows above the drop-zone — split out of
// FieldSchemaCardBody purely to stay under the per-function line budget
// (docs/CodingStandards.md), no behavior split.
const PickerRows = ({
    ticketSchema,
    schemas,
    lang,
    previewPacks,
    unlocked,
    schemaBusy,
    onSelectActiveSchema,
    t,
}: PickerRowsProps) => (
    // Task: "have both of them in one line" — Active schema and Preview
    // labels in used to each be their own full-width row, stacking one atop
    // the other even though side-by-side left plenty of room.
    <div className={styles.pickerRows}>
        {schemas.length > 1 && (
            <ActiveSchemaSelect
                ticketSchema={ticketSchema}
                schemas={schemas}
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                onSelectActiveSchema={onSelectActiveSchema}
                t={t}
            />
        )}
        <PreviewLangSelect lang={lang} previewPacks={previewPacks} t={t} />
    </div>
);

// The card's own body — split out of FieldSchemaCard purely to stay under
// the per-function line budget (docs/CodingStandards.md), no behavior split.
const FieldSchemaCardBody = ({
    ticketSchema,
    schemas,
    lang,
    labelT,
    previewPacks,
    unlocked,
    schemaBusy,
    schemaMessage,
    onSchemaFile,
    onSchemaText,
    onReset,
    onSelectActiveSchema,
    onToggleFieldVisible,
}: FieldSchemaCardProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.body}>
            <p className={styles.hint}>{t("settings.fieldSchema.hint")}</p>
            {/* Active-schema picker stays open — "others can be seen
                [without admin]" — only upload and Hide/Show (below) stay
                gated. Preview-language is no longer a picker at all (see
                PreviewLangSelect's own doc comment). */}
            <PickerRows
                ticketSchema={ticketSchema}
                schemas={schemas}
                lang={lang}
                previewPacks={previewPacks}
                unlocked={true}
                schemaBusy={schemaBusy}
                onSelectActiveSchema={onSelectActiveSchema}
                t={t}
            />
            {/* Task: "in field upload, hide/show are the one that cannt be
                done without admin others can be seen" — upload stays behind
                the real admin lock; paste-edit stays open (fixed `true`) —
                see the DataTable's Hide/Show column below for the other
                admin-gated one. */}
            <SchemaDropZone unlocked={unlocked} schemaBusy={schemaBusy} onSchemaFile={onSchemaFile} t={t} />
            <SchemaPasteBox unlocked={true} schemaBusy={schemaBusy} onSchemaText={onSchemaText} t={t} />
            {unlocked && (
                <button type="button" className={styles.resetButton} disabled={schemaBusy} onClick={onReset}>
                    {t("settings.fieldSchema.resetToDefault")}
                </button>
            )}
            {schemaMessage && (
                <p className={schemaMessage.bad ? styles.bad : styles.applied}>{schemaMessage.text}</p>
            )}
            <DataTable
                columns={fieldColumns({
                    lang,
                    t,
                    labelT,
                    // Hide/Show stays behind the real admin lock too — see
                    // the drop-zone's doc comment above.
                    unlocked,
                    schemaBusy,
                    onToggleVisible: onToggleFieldVisible,
                })}
                rows={getAllFields(ticketSchema)}
                getRowId={(field) => field.FieldId}
                emptyMessage={t("settings.fieldSchema.empty")}
            />
        </div>
    );
};

// Split out of FieldsLanguagePane (over the line budget — docs/CodingStandards.md)
// — the "Field schema" card, unchanged from the inline version it replaces.
export const FieldSchemaCard = (props: FieldSchemaCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            title={<span className="lbl">{t("settings.fieldSchema.title")}</span>}
            headerRight={
                <span className="chip num">
                    {getAllFields(props.ticketSchema).length} {t("settings.fieldSchema.fieldsSuffix")}
                </span>
            }
        >
            <FieldSchemaCardBody {...props} />
        </Card>
    );
};
