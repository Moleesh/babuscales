import { useState } from "react";

import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/WeighingScreen.module.css";

export interface ManualCalcBoxProps {
    label: string;
    onSubmit: (weightKg: number) => void;
}

// Split out of CalcCard (over the line budget — docs/CodingStandards.md) —
// Settings → Weighing → Rules.ManualEntry's editable stand-in for a
// not-yet-captured `CalcBox`. Same visual footprint (`.calc-box`), just a
// number input + a Set button instead of a read-only value/stamp. The typed
// weight goes through the exact same `pushCapture` pipeline as a scale
// reading — this component only ever calls `onSubmit`, never touches the DB
// or the capture list itself.
export const ManualCalcBox = ({ label, onSubmit }: ManualCalcBoxProps) => {
    const { t } = useTranslation();
    const [text, setText] = useState("");

    const submit = (): void => {
        const weightKg = Number(text);
        if (!Number.isFinite(weightKg) || weightKg <= 0) return;
        onSubmit(weightKg);
        setText("");
    };

    return (
        <div className={styles.calcBox}>
            <span className="lbl">{label}</span>
            <div className={styles.manualEntryRow}>
                <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    className={styles.manualEntryInput}
                    value={text}
                    placeholder={t("weigh.manualWeightPlaceholder")}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") submit();
                    }}
                />
                <button type="button" className="chip act" disabled={text === ""} onClick={submit}>
                    {t("weigh.manualWeightSet")}
                </button>
            </div>
        </div>
    );
};
