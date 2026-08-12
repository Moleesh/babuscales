import { Field } from "@components/Field";

import styles from "./_styles/ConnectionsPane.module.css";

export interface EmailPasswordFieldsProps {
    passwordInput: string;
    setPasswordInput: (value: string) => void;
    hasPassword: boolean;
    unlocked: boolean;
    onSavePassword: () => void;
    onClearPassword: () => void;
}

// Split out of EmailSmtpFields (over the line budget — docs/CodingStandards.md)
// — the password field and Save/Clear password row, unchanged from the
// inline version it replaces.
export const EmailPasswordFields = ({
    passwordInput,
    setPasswordInput,
    hasPassword,
    unlocked,
    onSavePassword,
    onClearPassword,
}: EmailPasswordFieldsProps) => (
    <>
        <Field id="smtpPassword" label={{ en: "Password" }}>
            <input
                id="smtpPassword"
                type="password"
                autoComplete="off"
                placeholder={
                    hasPassword ? "•••••••• saved — type a new one to replace it" : "SMTP account password"
                }
                value={passwordInput}
                disabled={!unlocked}
                onChange={(event) => setPasswordInput(event.target.value)}
            />
        </Field>
        <div className={styles.statusRow}>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked || !passwordInput.trim()}
                onClick={onSavePassword}
            >
                Save password
            </button>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked || !hasPassword}
                onClick={onClearPassword}
            >
                Clear password
            </button>
            <span className={hasPassword ? styles.statusOk : styles.hint}>
                {hasPassword ? "Password saved" : "No password saved"}
            </span>
        </div>
    </>
);
