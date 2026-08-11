import { useEffect, useState } from "react";

import { Card } from "@components/Card";
import { isSerialIndicatorSource, useIndicator, useIndicatorReading } from "@engines/indicator";

import { useSettings } from "../useSettings";
import styles from "./ConnectionsPane.module.css";
import { EmailCard } from "./EmailCard";
import { IndicatorCard } from "./IndicatorCard";
import { IntegrationsCard } from "./IntegrationsCard";
import { RemoteAccessCard } from "./RemoteAccessCard";
import { SmsCard } from "./SmsCard";

// Connections pane (demo/BabuScales-demo.html's `data-pane="conn"`) — PLAN
// §17's setup wizard, scoped down to what one iteration can actually
// deliver and verify: choose a port and baud, an optional custom regex
// pattern for indicators the built-in numeric fallback can't parse
// (src-tauri/src/devices/indicator.rs's `parse_weight`), see the live
// reading once saved. App.tsx's SerialConnectionSync opens/reopens the
// port automatically whenever this saves — "Applied immediately", the
// same shape as the Weighing pane's Stability gate (see IndicatorCard).
// The full wizard's "watch raw bytes live, confirm" steps aren't built:
// genuinely untestable without real hardware in hand, unlike everything
// else here (app/README.md known gap). The mock's own Integrations card
// lives on this same pane (below the serial config, in both branches) —
// see IntegrationsCard.
export const ConnectionsPane = () => {
    const { settings, unlocked, save } = useSettings();
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

    if (!serial) {
        return (
            <div className={styles.grid}>
                <Card title={<span className="lbl">Connections</span>}>
                    <p className={styles.hint}>
                        Serial port configuration is only available in the desktop app — this demo
                        (and the GitHub Pages build) has no real hardware to connect to, so the
                        indicator here is always simulated.
                    </p>
                </Card>
                <IntegrationsCard />
                <EmailCard />
                <SmsCard />
                <RemoteAccessCard />
            </div>
        );
    }

    return (
        <div className={styles.grid}>
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
            />
            <IntegrationsCard />
            <EmailCard />
            <SmsCard />
            <RemoteAccessCard />
        </div>
    );
};
