import { useSchema } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/FieldsLanguagePane.module.css";
import { FieldSchemaCard } from "./FieldSchemaCard";
import { LanguagePacksCard } from "./LanguagePacksCard";
import { useFieldSchemaUpload } from "./useFieldSchemaUpload";
import { useLanguagePackUpload } from "./useLanguagePackUpload";

export interface FieldsLanguagePaneProps {
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
}

// Fields & language pane (demo/BabuScales-demo.html's `data-pane="fields"`).
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
// Language packs: i18n/schemas.ts's languagePackSchema, I18nProvider's own
// doc comment ("loading is the caller's job") — `useTranslation().packs`
// is the live, already-loaded list (App.tsx loads it from `config` rows at
// startup); `onAddLanguagePack` is how a new one gets in — see App.tsx's
// `addLanguagePack`.
//
// The mock's own `dropLang`/`dropSchema` are real HTML5 drag-and-drop
// zones; this ports the click-to-choose half only (the `<input
// type="file">` each mock drop zone is built around) — same real
// parse/validate/save path, without also wiring `dragenter`/`dragover`/
// `drop` listeners nothing else in this codebase uses yet.
export const FieldsLanguagePane = ({ onAddLanguagePack }: FieldsLanguagePaneProps) => {
    const { packs, lang } = useTranslation();
    const { ticketSchema, schemas, setTicketSchema, setActiveSchemaId } = useSchema();
    const { unlocked } = useSettings();
    const { schemaMessage, schemaBusy, handleSchemaFile, resetSchema } =
        useFieldSchemaUpload(setTicketSchema);
    const { message, busy, handleFile } = useLanguagePackUpload(onAddLanguagePack);

    const toggleFieldVisible = (fieldId: string): void => {
        const updated: Schema = {
            ...ticketSchema,
            Fields: ticketSchema.Fields.map((field) =>
                field.FieldId === fieldId ? { ...field, Visible: field.Visible === false } : field,
            ),
        };
        void setTicketSchema(updated);
    };

    return (
        <div className={styles.grid}>
            <FieldSchemaCard
                ticketSchema={ticketSchema}
                schemas={schemas}
                lang={lang}
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                schemaMessage={schemaMessage}
                onSchemaFile={(file) => void handleSchemaFile(file)}
                onReset={() => void resetSchema()}
                onSelectActiveSchema={(schemaId) => void setActiveSchemaId(schemaId)}
                onToggleFieldVisible={toggleFieldVisible}
            />
            <LanguagePacksCard
                packs={packs}
                unlocked={unlocked}
                busy={busy}
                message={message}
                onFile={(file) => void handleFile(file)}
            />
        </div>
    );
};
