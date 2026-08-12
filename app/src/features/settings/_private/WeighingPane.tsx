import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { fixedPolicy } from "../settingsSchema";
import type { WeighingRules } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./_styles/WeighingPane.module.css";
import { WeighingRulesCard } from "./WeighingRulesCard";

// Weighing pane (demo/BabuScales-demo.html's `data-pane="weigh"`) — the three
// surviving rules (ruleDefs(t)), the stability gate, and the read-only "Fixed
// policy" table. Every control writes through `save()` immediately on
// change — there is no separate Save button here, matching the mock's own
// "Applied immediately" header note.
export const WeighingPane = () => {
    const { settings, unlocked, save } = useSettings();
    const { t } = useTranslation();

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
            <Card title={<span className="lbl">{t("settings.fixedPolicy.title")}</span>}>
                <div className={styles.policyTable}>
                    <table>
                        <tbody>
                            {fixedPolicy(t).map(([title, detail]) => (
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
