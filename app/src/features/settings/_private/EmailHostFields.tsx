import { Field, FieldGrid } from "@components/Field";

import type { SettingsBody, SmtpConfig } from "../settingsSchema";

export interface EmailHostFieldsProps {
    settings: SettingsBody;
    smtp: SmtpConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of EmailSmtpFields (over the line budget — docs/CodingStandards.md)
// — the host/port/username fields, unchanged from the inline version it
// replaces.
export const EmailHostFields = ({ settings, smtp, unlocked, onSave }: EmailHostFieldsProps) => (
    <>
        <FieldGrid columns={2}>
            <Field id="smtpHost" label={{ en: "SMTP host", ta: "SMTP ஹோஸ்ட்" }}>
                <input
                    id="smtpHost"
                    placeholder="smtp.example.com"
                    value={smtp.Host}
                    disabled={!unlocked}
                    onChange={(event) => onSave({ ...settings, Smtp: { ...smtp, Host: event.target.value } })}
                />
            </Field>
            <Field id="smtpPort" label={{ en: "Port", ta: "போர்ட்" }}>
                <input
                    id="smtpPort"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={65535}
                    value={smtp.Port}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, Smtp: { ...smtp, Port: Number(event.target.value) || 587 } })
                    }
                />
            </Field>
        </FieldGrid>
        <Field id="smtpUsername" label={{ en: "Username / from address", ta: "பயனர்பெயர் / அனுப்புநர் முகவரி" }}>
            <input
                id="smtpUsername"
                type="email"
                placeholder="tickets@example.com"
                value={smtp.Username}
                disabled={!unlocked}
                onChange={(event) => onSave({ ...settings, Smtp: { ...smtp, Username: event.target.value } })}
            />
        </Field>
    </>
);
