import { Card } from "@components/Card";
import { Select } from "@components/Select";
import { getAllFields } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/FieldsLanguagePane.module.css";
import { FieldSchemaTable, PREVIEW_KEY_CODE } from "./FieldSchemaTable";
import { SchemaDropZone, SchemaPasteBox } from "./SchemaSourceControls";

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
    /** Flips `Schema.DecimalsAllowed` and re-saves the active schema — same "Applied immediately" shape as `onToggleFieldVisible`. Open regardless of `unlocked`, same reasoning as upload/paste-edit above. */
    onToggleDecimalsAllowed: () => void;
}

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
    onToggleDecimalsAllowed,
}: FieldSchemaCardProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.body}>
            <p className={styles.hint}>{t("settings.fieldSchema.hint")}</p>
            {/* Task (coordinator, mid-flight): a single site-wide flag for
                whether Charge/Money columns/Capture weight/StoredTare weight
                may carry a (<=2-digit) fraction — schema-editing surface, not
                a Settings toggle, since it lives on `Schema` itself. Open
                regardless of `unlocked`, same as upload/paste-edit above. */}
            <label className={styles.decimalsAllowedRow}>
                <input
                    type="checkbox"
                    checked={ticketSchema.DecimalsAllowed ?? false}
                    onChange={onToggleDecimalsAllowed}
                />
                <span>
                    {t("settings.fieldSchema.decimalsAllowed.label")}
                    <small>{t("settings.fieldSchema.decimalsAllowed.note")}</small>
                </span>
            </label>
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
            <FieldSchemaTable
                ticketSchema={ticketSchema}
                lang={lang}
                labelT={labelT}
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                onToggleFieldVisible={onToggleFieldVisible}
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
