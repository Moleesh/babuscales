import { Card } from "@components/Card";

import type { SettingsBody } from "../settingsSchema";
import { AmountAndAdminPasswordFields } from "./AmountAndAdminPasswordFields";
import { DateTimeFormatFields } from "./DateTimeFormatFields";
import styles from "./SystemPane.module.css";
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

    return (
        <Card title={<span className="lbl">Date, time &amp; amounts</span>}>
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
                <p className={styles.hint}>
                    Date, time and amount formats are saved here but not yet read anywhere else in
                    the app — Reports, Dashboard and printed tickets still use the browser&apos;s own
                    formatting (known gap, app/README.md).
                </p>
            </div>
        </Card>
    );
};
