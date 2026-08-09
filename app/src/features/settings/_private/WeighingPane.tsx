import { Card } from "@components/Card";

import { FIXED_POLICY, RULE_DEFS } from "../settingsSchema";
import type { WeighingRules } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./WeighingPane.module.css";

const clampInt = (value: string, min: number, max: number, fallback: number): number => {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

// Weighing pane (demo/BabuScale-demo.html's `data-pane="weigh"`) — the three
// surviving rules (RULE_DEFS), the stability gate, and the read-only "Fixed
// policy" table. Every control writes through `save()` immediately on
// change — there is no separate Save button here, matching the mock's own
// "Applied immediately" header note.
export const WeighingPane = () => {
    const { settings, unlocked, save } = useSettings();

    const setRule = (key: keyof WeighingRules, checked: boolean): void => {
        void save({ ...settings, Rules: { ...settings.Rules, [key]: checked } });
    };

    return (
        <div className={styles.grid}>
            <Card
                title={<span className="lbl">Weighing rules</span>}
                headerRight={<span className={styles.applied}>Applied immediately</span>}
            >
                <div className={styles.checks}>
                    {RULE_DEFS.map(([key, label, note]) => (
                        <label key={key} className={styles.ck}>
                            <input
                                type="checkbox"
                                checked={settings.Rules[key]}
                                disabled={!unlocked}
                                onChange={(event) => setRule(key, event.target.checked)}
                            />
                            <span>
                                {label}
                                <small>{note}</small>
                            </span>
                        </label>
                    ))}
                </div>
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
                            value={settings.Stability.ReadingsInRow}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Stability: {
                                        ...settings.Stability,
                                        ReadingsInRow: clampInt(
                                            event.target.value,
                                            1,
                                            20,
                                            settings.Stability.ReadingsInRow,
                                        ),
                                    },
                                })
                            }
                        />
                        <span>readings in a row, all within ±</span>
                        <input
                            id="setBand"
                            type="number"
                            min={1}
                            max={200}
                            value={settings.Stability.BandKg}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Stability: {
                                        ...settings.Stability,
                                        BandKg: clampInt(
                                            event.target.value,
                                            1,
                                            200,
                                            settings.Stability.BandKg,
                                        ),
                                    },
                                })
                            }
                        />
                        <span>kg of each other</span>
                    </div>
                </div>
            </Card>
            <Card title={<span className="lbl">Fixed policy</span>}>
                <div className={styles.policyTable}>
                    <table>
                        <tbody>
                            {FIXED_POLICY.map(([title, detail]) => (
                                <tr key={title}>
                                    <td>
                                        <b>{title}</b>
                                        <div className={styles.policyDetail}>{detail}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
