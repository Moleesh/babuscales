import { Field } from "@components/Field";

import type { SettingsBody } from "../settingsSchema";

export interface TallyFieldsProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of WebhookTallyBoardFields (over the line budget —
// docs/CodingStandards.md) — the export-folder field, unchanged from the
// inline version it replaces.
export const TallyFields = ({ settings, unlocked, onSave }: TallyFieldsProps) => (
    <Field id="tallyFolder" label={{ en: "Export folder", ta: "ஏற்றுமதி கோப்புறை" }}>
        <input
            id="tallyFolder"
            placeholder="C:\BabuScales\TallyExport"
            value={settings.Tally.Folder}
            disabled={!unlocked}
            onChange={(event) => onSave({ ...settings, Tally: { Folder: event.target.value } })}
        />
    </Field>
);
