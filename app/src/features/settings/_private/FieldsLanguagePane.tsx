import { useToast } from "@components/Toast";
import { useSchema } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";
import { EN_STRINGS } from "@i18n/strings";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/FieldsLanguagePane.module.css";
import { FieldSchemaCard, PREVIEW_KEY_CODE } from "./FieldSchemaCard";
import { useFieldSchemaUpload } from "./useFieldSchemaUpload";

// Fields & print pane (demo/BabuScales-demo.html's `data-pane="fields"`).
// Its "Print templates" card (a New-template wizard with live preview in the
// mock — not ported, the roadmap names the visual template designer as a
// later item, "designed for, not built"; the three built-in layouts
// A4/Thermal/Matrix are the only templates this build has) moved back to
// Print, next to DefaultPrinterCard (task: "printer and print should be in
// same place both dont need admin" — PrintTemplatesCard.tsx).
// Task: "field is read only can upload or edit hide show others are admin"
// — refined that: `unlocked` here is the real admin lock again (not
// hardcoded), but FieldSchemaCard itself now only gates the active-schema
// picker, preview-language picker, and reset button with it; upload,
// paste-edit, and the per-field Hide/Show toggle stay open regardless (see
// FieldSchemaCard.tsx).
//
// The field schema itself is real and
// persisted (each upload its own `config` row, ConfigKind: "Schema", keyed
// by SchemaId — db/schema.ts) and drives Weighing's field rendering live
// (TicketFieldsCard.tsx/SchemaFieldRow.tsx read it via `useSchema()`),
// including `Visible`/`Required`/`ReadOnly`/`Validate`. A site can save
// several schemas side by side and pick which is active from the dropdown
// below; a
// field's own show/hide toggle re-saves the active schema with just that
// field's `Visible` flipped, in place of hand-editing and re-uploading.
//
// The mock's own `dropSchema` is a real HTML5 drag-and-drop
// zone; this ports the click-to-choose half only (the `<input
// type="file">` each mock drop zone is built around) — same real
// parse/validate/save path, without also wiring `dragenter`/`dragover`/
// `drop` listeners nothing else in this codebase uses yet.
export const FieldsLanguagePane = () => {
    const { lang, t } = useTranslation();
    const { ticketSchema, schemas, setTicketSchema, setActiveSchemaId } = useSchema();
    const { unlocked } = useSettings();
    const { schemaMessage, schemaBusy, handleSchemaFile, handleSchemaText, resetSchema } =
        useFieldSchemaUpload(setTicketSchema);
    const { showToast } = useToast();

    // Which pack's strings the field-schema table's Label column resolves
    // against. Used to be its own independent selection (an admin could
    // preview e.g. Tamil labels without switching the whole running app
    // over); task "Preview labels in should auto select the language
    // curreclt used nad should be disabled" removed that — it now always
    // tracks the app's own active runtime language (`lang`) and the picker
    // itself can't be changed at all (FieldSchemaCard's PreviewLangSelect is
    // unconditionally disabled), admin or not.
    const { packs } = useTranslation();
    // `PREVIEW_KEY_CODE` ("Key" in the picker) shows each row's raw i18n key
    // untranslated instead of resolving it against any pack — task: "add one
    // more here ie) key and english". No longer reachable via the picker
    // (which only ever shows `lang`) but `previewT`/`fieldLabel` still
    // handle it, so leaving the option wired costs nothing if it comes back.
    const previewT = (key: string): string =>
        lang === PREVIEW_KEY_CODE
            ? key
            : packs.find((pack) => pack.Code === lang)?.Strings[key] ?? EN_STRINGS[key] ?? key;

    const toggleFieldVisible = (fieldId: string): void => {
        const updated: Schema = {
            ...ticketSchema,
            Segments: ticketSchema.Segments.map((seg) => ({
                ...seg,
                Fields: seg.Fields.map((field) =>
                    field.FieldId === fieldId ? { ...field, Visible: field.Visible === false } : field,
                ),
            })),
        };
        void setTicketSchema(updated).then(() => showToast(t("components.toast.saved")));
    };

    return (
        <div className={styles.grid}>
            <FieldSchemaCard
                ticketSchema={ticketSchema}
                schemas={schemas}
                lang={lang}
                labelT={previewT}
                previewPacks={packs}
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                schemaMessage={schemaMessage}
                onSchemaFile={(file) => void handleSchemaFile(file)}
                onSchemaText={(text) => void handleSchemaText(text)}
                onReset={() => void resetSchema()}
                onSelectActiveSchema={(schemaId) => void setActiveSchemaId(schemaId)}
                onToggleFieldVisible={toggleFieldVisible}
            />
        </div>
    );
};
