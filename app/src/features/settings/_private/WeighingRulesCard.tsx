import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { ruleDefs } from "../settingsSchema";
import type { SettingsBody, WeighingRules } from "../settingsSchema";
import styles from "./_styles/WeighingPane.module.css";

export interface WeighingRulesCardProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSetRule: (key: keyof WeighingRules, checked: boolean) => void;
}

// Split out of WeighingPane (over the line budget — docs/CodingStandards.md)
// — the three surviving rules (ruleDefs(t)), unchanged from the inline
// version it replaces. The stability gate moved out to the Weight indicator
// card (by request) — it configures the indicator's own settle detection,
// not a weighing rule, so it reads more naturally there.
export const WeighingRulesCard = ({ settings, unlocked, onSetRule }: WeighingRulesCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            sticky
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
        </Card>
    );
};
