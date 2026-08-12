import { useSchema } from "@engines/schemaEngine";
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
// Field schema (task #50, PLAN §8.3) — the schema itself is real and
// persisted (`config` row, ConfigKind: "Schema", db/schema.ts) and its
// Labels genuinely drive Weighing's five built-in fields live
// (TicketFieldsCard.tsx reads it via `useSchema()`). What's still NOT
// built — documented, not attempted — is schema-driven field *rendering*:
// uploading a schema with a new custom FieldId doesn't add an input to
// Weighing, and `VisibleWhen`/`RequiredWhen`/`ReadOnlyWhen`/`Validate`
// formulas aren't evaluated against the ticket form. That's a separate,
// much larger feature (app/README.md known gap). Uploading a schema that
// only relabels/reorders/indexes the five existing FieldIds works today;
// a schema introducing new ones is accepted (it validates) but its extra
// fields are simply inert until that feature exists.
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
    const { ticketSchema, setTicketSchema } = useSchema();
    const { unlocked } = useSettings();
    const { schemaMessage, schemaBusy, handleSchemaFile, resetSchema } =
        useFieldSchemaUpload(setTicketSchema);
    const { message, busy, handleFile } = useLanguagePackUpload(onAddLanguagePack);

    return (
        <div className={styles.grid}>
            <FieldSchemaCard
                ticketSchema={ticketSchema}
                lang={lang}
                unlocked={unlocked}
                schemaBusy={schemaBusy}
                schemaMessage={schemaMessage}
                onSchemaFile={(file) => void handleSchemaFile(file)}
                onReset={() => void resetSchema()}
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
