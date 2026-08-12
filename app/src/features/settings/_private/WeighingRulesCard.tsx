import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { ruleDefs } from "../settingsSchema";
import type { SettingsBody, WeighingRules } from "../settingsSchema";
import styles from "./_styles/WeighingPane.module.css";
import { StabilityGateFields } from "./StabilityGateFields";

export interface WeighingRulesCardProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSetRule: (key: keyof WeighingRules, checked: boolean) => void;
    onSetStability: (next: SettingsBody["Stability"]) => void;
}

// Split out of WeighingPane (over the line budget — docs/CodingStandards.md)
// — the three surviving rules (ruleDefs(t)) and the stability gate,
// unchanged from the inline version it replaces.
export const WeighingRulesCard = ({
    settings,
    unlocked,
    onSetRule,
    onSetStability,
}: WeighingRulesCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            title={<span className="lbl">{t("settings.weighingRules.title")}</span>}
            headerRight={<span className={styles.applied}>{t("settings.weighingRules.appliedImmediately")}</span>}
        >
            <div className={styles.checks}>
                {ruleDefs(t).map(([key, label, note]) => (
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
};
