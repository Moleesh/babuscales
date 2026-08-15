import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody } from "../settingsSchema";
import styles from "./_styles/SystemPane.module.css";

export interface AmountAndAdminPasswordFieldsProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    newPassword: string;
    setNewPassword: (value: string) => void;
    pwFlash: string | null;
    commitPassword: () => void;
}

// Split out of DateTimeFormatsCard (over the line budget — docs/CodingStandards.md)
// — the Amount rounding select and admin-password field, unchanged from the
// inline version it replaces.
export const AmountAndAdminPasswordFields = ({
    settings,
    unlocked,
    onSave,
    newPassword,
    setNewPassword,
    pwFlash,
    commitPassword,
}: AmountAndAdminPasswordFieldsProps) => {
    const { t } = useTranslation();
    return (
    <>
        <FieldGrid columns={2}>
            <Field id="setAmt" label={t("settings.amountFields.rounding")}>
                <Select
                    id="setAmt"
                    value={String(settings.Formats.AmountDp)}
                    options={[
                        { value: "2", label: t("settings.amountFields.twoDecimals") },
                        { value: "0", label: t("settings.amountFields.wholeRupees") },
                    ]}
                    disabled={!unlocked}
                    onChange={(value) =>
                        onSave({
                            ...settings,
                            Formats: { ...settings.Formats, AmountDp: value === "0" ? 0 : 2 },
                        })
                    }
                />
            </Field>
            <Field id="setAdmPw" label={t("settings.adminPassword")}>
                <input
                    id="setAdmPw"
                    type="password"
                    autoComplete="off"
                    placeholder={t("settings.amountFields.newPasswordPlaceholder")}
                    value={newPassword}
                    disabled={!unlocked}
                    onChange={(event) => setNewPassword(event.target.value)}
                    onBlur={commitPassword}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") commitPassword();
                    }}
                />
            </Field>
        </FieldGrid>
        {pwFlash && <p className={styles.hint}>{pwFlash}</p>}
    </>
    );
};
