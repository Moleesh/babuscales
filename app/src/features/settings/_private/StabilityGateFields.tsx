import { Field } from "@components/Field";

import type { SettingsBody } from "../settingsSchema";
import styles from "./_styles/WeighingPane.module.css";

const clampInt = (value: string, min: number, max: number, fallback: number): number => {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

export interface StabilityGateFieldsProps {
    stability: SettingsBody["Stability"];
    unlocked: boolean;
    onChange: (next: SettingsBody["Stability"]) => void;
}

// Split out of WeighingRulesCard, then moved onto the Weight indicator card
// (by request — this is the indicator's own settle detection, not a
// weighing rule). "Make it better" pass: proper `Field` labels/ids for
// each input instead of one shared sentence built out of bare `<input>`s,
// plus a one-line explanation of what the gate actually does — the old
// "N readings in a row, all within ±M kg of each other" phrasing read fine
// once but gave no sense of *why* those two numbers exist.
export const StabilityGateFields = ({ stability, unlocked, onChange }: StabilityGateFieldsProps) => (
    <div className={styles.stability}>
        <span className="lbl">Stability gate</span>
        <p className={styles.hint}>
            The reading is only treated as settled once it holds steady for this many
            consecutive samples — capture stays locked until then.
        </p>
        <div className={styles.inline}>
            <Field id="setReads" label="Readings in a row">
                <input
                    id="setReads"
                    type="number"
                    min={1}
                    max={20}
                    value={stability.ReadingsInRow}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onChange({
                            ...stability,
                            ReadingsInRow: clampInt(event.target.value, 1, 20, stability.ReadingsInRow),
                        })
                    }
                />
            </Field>
            <Field id="setBand" label="Band (± kg)">
                <input
                    id="setBand"
                    type="number"
                    min={1}
                    max={200}
                    value={stability.BandKg}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onChange({
                            ...stability,
                            BandKg: clampInt(event.target.value, 1, 200, stability.BandKg),
                        })
                    }
                />
            </Field>
        </div>
    </div>
);
