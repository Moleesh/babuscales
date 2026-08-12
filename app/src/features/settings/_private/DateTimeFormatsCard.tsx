import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody } from "../settingsSchema";
import styles from "./_styles/SystemPane.module.css";
import { AmountAndAdminPasswordFields } from "./AmountAndAdminPasswordFields";
import { DateTimeFormatFields } from "./DateTimeFormatFields";
import { useAdminPasswordField } from "./useAdminPasswordField";

export interface DateTimeFormatsCardProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    changeAdminPassword: (newPassword: string) => Promise<void>;
}

// Split out of SystemPane (over the line budget — docs/CodingStandards.md)
// — date/time/amount format preferences plus the admin-password field,
// unchanged from the inline version it replaces. Persisted and editable
// here but nothing else in the app reads Formats back yet — a narrower
// version of Settings than the mock's, documented in app/README.md's known
// gaps rather than silently pretended away. Further split into
// DateTimeFormatFields/AmountAndAdminPasswordFields, each still over its
// own budget on its own.
export const DateTimeFormatsCard = ({
    settings,
    unlocked,
    onSave,
    changeAdminPassword,
}: DateTimeFormatsCardProps) => {
    const { newPassword, setNewPassword, pwFlash, commitPassword } =
        useAdminPasswordField(changeAdminPassword);
    const { t } = useTranslation();

    return (
        <Card title={<span className="lbl">{t("settings.dateTimeFormats.title")}</span>}>
            <div className={styles.body}>
                <DateTimeFormatFields settings={settings} unlocked={unlocked} onSave={onSave} />
                <AmountAndAdminPasswordFields
                    settings={settings}
                    unlocked={unlocked}
                    onSave={onSave}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    pwFlash={pwFlash}
                    commitPassword={commitPassword}
                />
                <p className={styles.hint}>{t("settings.dateTimeFormats.hint")}</p>
            </div>
        </Card>
    );
};
