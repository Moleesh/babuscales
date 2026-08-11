import { Field, FieldGrid } from "@components/Field";

import type { SettingsBody } from "../settingsSchema";
import styles from "./SystemPane.module.css";

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
}: AmountAndAdminPasswordFieldsProps) => (
    <>
        <FieldGrid columns={2}>
            <Field id="setAmt" label={{ en: "Amount rounding" }}>
                <select
                    id="setAmt"
                    value={String(settings.Formats.AmountDp)}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({
                            ...settings,
                            Formats: { ...settings.Formats, AmountDp: event.target.value === "0" ? 0 : 2 },
                        })
                    }
                >
                    <option value="2">2 decimals — ₹ 250.00</option>
                    <option value="0">Whole rupees — ₹ 250</option>
                </select>
            </Field>
            <Field id="setAdmPw" label={{ en: "Admin password" }}>
                <input
                    id="setAdmPw"
                    type="password"
                    autoComplete="off"
                    placeholder="New password"
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
