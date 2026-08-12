import { Field } from "@components/Field";

import styles from "./_styles/SystemPane.module.css";

export interface LicenceActivationFieldsProps {
    requestCode: string | null;
    codeInput: string;
    setCodeInput: (value: string) => void;
    unlocked: boolean;
    hasCode: boolean;
    onActivate: () => void;
    onClear: () => void;
}

// Split out of LicenceCard (over the line budget — docs/CodingStandards.md)
// — the request/activation-code fields and Activate/Clear button row,
// unchanged from the inline version it replaces.
export const LicenceActivationFields = ({
    requestCode,
    codeInput,
    setCodeInput,
    unlocked,
    hasCode,
    onActivate,
    onClear,
}: LicenceActivationFieldsProps) => (
    <>
        <Field id="licReqCode" label={{ en: "Request code — send to Babulens" }}>
            <input
                id="licReqCode"
                readOnly
                value={requestCode ?? "Not available in this build"}
                onFocus={(event) => event.target.select()}
            />
        </Field>
        <Field id="licActCode" label={{ en: "Activation code" }}>
            <input
                id="licActCode"
                placeholder="Paste the code Babulens sent back"
                value={codeInput}
                disabled={!unlocked}
                onChange={(event) => setCodeInput(event.target.value)}
            />
        </Field>
        <div className={styles.statusRow}>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked || !codeInput.trim()}
                onClick={onActivate}
            >
                Activate
            </button>
            {hasCode && (
                <button
                    type="button"
                    className={`${styles.mini} ${styles.danger}`}
                    disabled={!unlocked}
                    onClick={onClear}
                >
                    Clear code
                </button>
            )}
        </div>
    </>
);
