import { Card } from "@components/Card";

import { FIXED_POLICY } from "../settingsSchema";
import type { WeighingRules } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./WeighingPane.module.css";
import { WeighingRulesCard } from "./WeighingRulesCard";

// The read-only "Fixed policy" table doesn't depend on props or state, so
// it's a module constant rather than JSX inside the component body.
const FIXED_POLICY_CARD = (
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
);

// Weighing pane (demo/BabuScales-demo.html's `data-pane="weigh"`) — the three
// surviving rules (RULE_DEFS), the stability gate, and the read-only "Fixed
// policy" table. Every control writes through `save()` immediately on
// change — there is no separate Save button here, matching the mock's own
// "Applied immediately" header note.
export const WeighingPane = () => {
    const { settings, unlocked, save } = useSettings();

    const setRule = (key: keyof WeighingRules, checked: boolean): void => {
        void save({ ...settings, Rules: { ...settings.Rules, [key]: checked } });
    };

    const setStability = (next: typeof settings.Stability): void => {
        void save({ ...settings, Stability: next });
    };

    return (
        <div className={styles.grid}>
            <WeighingRulesCard
                settings={settings}
                unlocked={unlocked}
                onSetRule={setRule}
                onSetStability={setStability}
            />
            {FIXED_POLICY_CARD}
        </div>
    );
};
