import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody } from "../settingsSchema";
import styles from "./_styles/SystemPane.module.css";
import { AmountAndAdminPasswordFields } from "./AmountAndAdminPasswordFields";
import { useAdminPasswordField } from "./useAdminPasswordField";

export interface AmountAndAdminPasswordCardProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    changeAdminPassword: (newPassword: string) => Promise<void>;
}

// Split out of DateTimeFormatsCard — date/time moved to WeighingPane (ticket
// numbering/date-time are about the weighing flow; amount rounding and the
// admin password aren't, so they keep their own card here instead of
// following). Unchanged from the fields' inline version otherwise.
export const AmountAndAdminPasswordCard = ({
    settings,
    unlocked,
    onSave,
    changeAdminPassword,
}: AmountAndAdminPasswordCardProps) => {
    const { newPassword, setNewPassword, pwFlash, commitPassword } =
        useAdminPasswordField(changeAdminPassword);
    const { t } = useTranslation();

    return (
        <Card title={<span className="lbl">{t("settings.amountAdmin.title")}</span>}>
            <div className={styles.body}>
                <AmountAndAdminPasswordFields
                    settings={settings}
                    unlocked={unlocked}
                    onSave={onSave}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    pwFlash={pwFlash}
                    commitPassword={commitPassword}
                />
            </div>
        </Card>
    );
};
