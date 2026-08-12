import { Card } from "@components/Card";
import type { IndicatorReading } from "@engines/indicator";

import type { ConnectionsConfig, SettingsBody } from "../settingsSchema";
import styles from "./_styles/ConnectionsPane.module.css";
import { IndicatorPortFields } from "./IndicatorPortFields";
import { IndicatorStatusFields } from "./IndicatorStatusFields";

export interface IndicatorCardProps {
    settings: SettingsBody;
    conn: ConnectionsConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    ports: string[];
    refreshing: boolean;
    onRescan: () => void;
    error: string | null;
    reading: IndicatorReading;
}

// Split out of ConnectionsPane (over the line budget — docs/CodingStandards.md)
// — the serial weight-indicator card (port/baud/pattern, live reading),
// unchanged from the inline version it replaces. Only rendered when a real
// serial indicator source is present — see ConnectionsPane's own comment on
// why the desktop-only "watch raw bytes live" wizard steps aren't built.
// Further split into IndicatorPortFields/IndicatorStatusFields, each still
// over its own budget on its own.
export const IndicatorCard = ({
    settings,
    conn,
    unlocked,
    onSave,
    ports,
    refreshing,
    onRescan,
    error,
    reading,
}: IndicatorCardProps) => (
    <Card
        title={<span className="lbl">Weight indicator</span>}
        headerRight={<span className={styles.applied}>Applied immediately</span>}
    >
        <div className={styles.body}>
            <IndicatorPortFields settings={settings} conn={conn} unlocked={unlocked} onSave={onSave} ports={ports} />
            <IndicatorStatusFields
                settings={settings}
                conn={conn}
                unlocked={unlocked}
                onSave={onSave}
                refreshing={refreshing}
                onRescan={onRescan}
                error={error}
                reading={reading}
            />
        </div>
    </Card>
);
