import { Field, FieldGrid } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

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
export const EmailHostFields = ({ settings, smtp, unlocked, onSave }: EmailHostFieldsProps) => {
    const { t } = useTranslation();
    return (
    <>
        <FieldGrid columns={2}>
            <Field id="smtpHost" label={t("settings.email.host")}>
                <input
                    id="smtpHost"
                    placeholder="smtp.example.com"
                    value={smtp.Host}
                    disabled={!unlocked}
                    autoComplete="off"
                    onChange={(event) => onSave({ ...settings, Smtp: { ...smtp, Host: event.target.value } })}
                />
            </Field>
            <Field id="smtpPort" label={t("settings.port")}>
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
        <Field id="smtpUsername" label={t("settings.email.username")}>
            <input
                id="smtpUsername"
                type="email"
                placeholder="tickets@example.com"
                value={smtp.Username}
                disabled={!unlocked}
                autoComplete="off"
                onChange={(event) => onSave({ ...settings, Smtp: { ...smtp, Username: event.target.value } })}
            />
        </Field>
    </>
    );
};
