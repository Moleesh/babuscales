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

// Split out of WeighingRulesCard (over the line budget — docs/CodingStandards.md)
// — the "Stability gate" label + its two number inputs, unchanged from the
// inline version it replaces.
export const StabilityGateFields = ({ stability, unlocked, onChange }: StabilityGateFieldsProps) => (
    <div className={styles.stability}>
        <label className="lbl" htmlFor="setReads">
            Stability gate
        </label>
        <div className={styles.inline}>
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
            <span>readings in a row, all within ±</span>
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
            <span>kg of each other</span>
        </div>
    </div>
);
