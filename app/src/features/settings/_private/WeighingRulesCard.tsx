import { Card } from "@components/Card";

import { RULE_DEFS } from "../settingsSchema";
import type { SettingsBody, WeighingRules } from "../settingsSchema";
import { StabilityGateFields } from "./StabilityGateFields";
import styles from "./WeighingPane.module.css";

export interface WeighingRulesCardProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSetRule: (key: keyof WeighingRules, checked: boolean) => void;
    onSetStability: (next: SettingsBody["Stability"]) => void;
}

// Split out of WeighingPane (over the line budget — docs/CodingStandards.md)
// — the three surviving rules (RULE_DEFS) and the stability gate,
// unchanged from the inline version it replaces.
export const WeighingRulesCard = ({
    settings,
    unlocked,
    onSetRule,
    onSetStability,
}: WeighingRulesCardProps) => (
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
                        onChange={(event) => onSetRule(key, event.target.checked)}
                    />
                    <span>
                        {label}
                        <small>{note}</small>
                    </span>
                </label>
            ))}
        </div>
        <StabilityGateFields stability={settings.Stability} unlocked={unlocked} onChange={onSetStability} />
    </Card>
);
