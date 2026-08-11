import type { SettingsBody, SmtpConfig } from "../settingsSchema";
import { EmailHostFields } from "./EmailHostFields";
import { EmailPasswordFields } from "./EmailPasswordFields";

export interface EmailSmtpFieldsProps {
    settings: SettingsBody;
    smtp: SmtpConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    passwordInput: string;
    setPasswordInput: (value: string) => void;
    hasPassword: boolean;
    onSavePassword: () => void;
    onClearPassword: () => void;
}

// Split out of EmailCard (over the line budget — docs/CodingStandards.md) —
// the host/port/username/password fields and Save/Clear password row,
// unchanged from the inline version it replaces. Further split into
// EmailHostFields/EmailPasswordFields, each still over its own budget on
// its own.
export const EmailSmtpFields = ({
    settings,
    smtp,
    unlocked,
    onSave,
    passwordInput,
    setPasswordInput,
    hasPassword,
    onSavePassword,
    onClearPassword,
}: EmailSmtpFieldsProps) => (
    <>
        <EmailHostFields settings={settings} smtp={smtp} unlocked={unlocked} onSave={onSave} />
        <EmailPasswordFields
            passwordInput={passwordInput}
            setPasswordInput={setPasswordInput}
            hasPassword={hasPassword}
            unlocked={unlocked}
            onSavePassword={onSavePassword}
            onClearPassword={onClearPassword}
        />
    </>
);
