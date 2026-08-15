import { useEffect, useState } from "react";

import { Card } from "@components/Card";
import { isSerialIndicatorSource, useIndicator, useIndicatorReading } from "@engines/indicator";
import { useTranslation } from "@i18n/useTranslation";

import type { WeighingRules } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./_styles/WeighingPane.module.css";
import { IndicatorCard } from "./IndicatorCard";
import { StabilityGateFields } from "./StabilityGateFields";
import { TicketAndDateTimeCard } from "./TicketAndDateTimeCard";
import { WeighingRulesCard } from "./WeighingRulesCard";

// Weighing pane (demo/BabuScales-demo.html's `data-pane="weigh"`) — the three
// surviving rules (ruleDefs(t)) and the stability gate. Every control writes
// through `save()` immediately on change — there is no separate Save button
// here, matching the mock's own "Applied immediately" header note.
// The weight-indicator card (port/baud/pattern, live reading) moved here
// from ConnectionsPane by request — it's about the scale feeding this exact
// screen's weighing rules, not a generic "connection" like Email/SMS/webhook
// integrations, so it reads more naturally alongside them. Same
// serial-only guard as before: nothing to show on the demo/web build, which
// has no real port to configure.
export interface WeighingPaneProps {
    /** `DataPort.resetDocSeries("Ticket", "default")` — lives at App level, wired through here for TicketNumberingCard's Reset (ticket numbering moved here from SystemPane by request). Resolves with the new `Epoch`; TicketAndDateTimeCard persists it into `Numbering.CurrentEpoch`. */
    onResetTicketSeries: (startSeq: number) => Promise<{ Epoch: number }>;
}

export const WeighingPane = ({ onResetTicketSeries }: WeighingPaneProps) => {
    const { settings, unlocked, save } = useSettings();
    const { t } = useTranslation();
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const serial = isSerialIndicatorSource(indicator) ? indicator : null;
    const [ports, setPorts] = useState<string[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const conn = settings.Connections;

    const rescan = (): void => {
        if (!serial) return;
        setRefreshing(true);
        void serial
            .listPorts()
            .then(setPorts)
            .finally(() => setRefreshing(false));
    };

    useEffect(rescan, [serial]);

    const setRule = (key: keyof WeighingRules, checked: boolean): void => {
        void save({ ...settings, Rules: { ...settings.Rules, [key]: checked } });
    };

    const setStability = (next: typeof settings.Stability): void => {
        void save({ ...settings, Stability: next });
    };

    return (
        <div className={styles.grid}>
            {/* Column 1 — the weight indicator (by request — 3-column layout:
                indicator / ticket+date / rules). */}
            <div className={styles.col}>
                {serial ? (
                    <IndicatorCard
                        settings={settings}
                        conn={conn}
                        unlocked={unlocked}
                        onSave={(next) => void save(next)}
                        ports={ports}
                        refreshing={refreshing}
                        onRescan={rescan}
                        error={serial.getConnectionError()}
                        reading={reading}
                        onSetStability={setStability}
                    />
                ) : (
                    // Demo/web build has no serial port to configure, so no
                    // IndicatorCard — but the stability gate still applies to
                    // the simulated indicator, so it gets its own small card
                    // instead of disappearing.
                    <Card title={<span className="lbl">{t("settings.indicator.title")}</span>}>
                        <StabilityGateFields
                            stability={settings.Stability}
                            unlocked={unlocked}
                            onChange={setStability}
                        />
                    </Card>
                )}
            </div>
            {/* Column 2 — ticket numbering and date & time merged into one
                card (by request), instead of two separate cards stacked. */}
            <div className={styles.col}>
                <TicketAndDateTimeCard
                    settings={settings}
                    unlocked={unlocked}
                    onSave={(next) => void save(next)}
                    onResetTicketSeries={onResetTicketSeries}
                />
            </div>
            {/* Column 3 — weighing rules. */}
            <div className={styles.col}>
                <WeighingRulesCard settings={settings} unlocked={unlocked} onSetRule={setRule} />
            </div>
        </div>
    );
};
