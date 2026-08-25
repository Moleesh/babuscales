import { useState } from "react";

import { Card } from "@components/Card";
import { useToast } from "@components/Toast";
import { useSchema } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";
import { EN_STRINGS } from "@i18n/strings";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/FieldsLanguagePane.module.css";
import { FieldSchemaCard } from "./FieldSchemaCard";
import { useFieldSchemaUpload } from "./useFieldSchemaUpload";

// The mock's other card, "Print templates" (a New-template wizard with live
// preview), isn't ported: the roadmap names the visual template designer as
// a later item — "designed for, not built" — so it stays out of scope here;
// the three built-in layouts (A4/Thermal/Matrix) are the only templates this
// build has. `t`-threaded (mirrors ruleDefs(t) in settingsSchema.ts) since it
// needs to re-render on language change — no longer a static module
// constant. Moved here from the old Print & printers pane (task: "we need
// business and appearance / field and print / language / printer" — the
// Settings tab bar regrouping this session) — a template governs the same
// ticket schema this tab's field editor works on, so it reads more naturally
// alongside Fields than alongside the Printer tab's device/fixture config.
const templatesCard = (t: (key: string) => string) => (
    <Card title={<span className="lbl">{t("settings.printTemplates.title")}</span>}>
        <p className={styles.hint}>{t("settings.printTemplates.hint")}</p>
    </Card>
);

// Fields & print pane (demo/BabuScales-demo.html's `data-pane="fields"`,
// its "Print templates" card folded in from the old Print & printers pane).
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
    // against — starts at the app's own active runtime language, but is its
    // own selection (not tied to the header language toggle), so an admin
    // can preview e.g. Tamil field labels here without switching the whole
    // running app over. A pack-specific `t`, independent of the ambient one
    // above — the fix for the table always rendering English regardless of
    // this pick: it used to run every label through the ambient `t`, which
    // only reflects the header toggle, and there was no way to see a pack's
    // labels without flipping that global switch.
    const [previewLang, setPreviewLang] = useState(lang);
    const { packs } = useTranslation();
    const previewT = (key: string): string =>
        packs.find((pack) => pack.Code === previewLang)?.Strings[key] ?? EN_STRINGS[key] ?? key;

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
                lang={previewLang}
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
                onSelectPreviewLang={setPreviewLang}
            />
            {templatesCard(t)}
        </div>
    );
};
