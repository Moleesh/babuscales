import { Field } from "@components/Field";

import styles from "./_styles/ConnectionsPane.module.css";

export interface TestSendFieldProps {
    id: string;
    label: string;
    type: "email" | "tel";
    placeholder: string;
    value: string;
    setValue: (value: string) => void;
    unlocked: boolean;
    sending: boolean;
    buttonLabel: string;
    onSend: () => void;
}

// Split out of EmailCard/SmsCard (over the line budget —
// docs/CodingStandards.md) — the "send a test message" field + button row,
// shared since both cards repeated the identical shape, unchanged from the
// inline versions it replaces.
export const TestSendField = ({
    id,
    label,
    type,
    placeholder,
    value,
    setValue,
    unlocked,
    sending,
    buttonLabel,
    onSend,
}: TestSendFieldProps) => (
    <>
        <Field id={id} label={label}>
            <input
                id={id}
                type={type}
                placeholder={placeholder}
                value={value}
                disabled={!unlocked}
                autoComplete="off"
                onChange={(event) => setValue(event.target.value)}
            />
        </Field>
        <div className={styles.statusRow}>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked || sending || !value.trim()}
                onClick={onSend}
            >
                {sending ? "Sending…" : buttonLabel}
            </button>
        </div>
    </>
);
