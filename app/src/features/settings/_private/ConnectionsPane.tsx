import { Card } from "@components/Card";
import { isSerialIndicatorSource, useIndicator } from "@engines/indicator";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ConnectionsPane.module.css";
import { EmailCard } from "./EmailCard";
import { IntegrationConfigCard } from "./IntegrationConfigCard";
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
// same shape as the Weighing pane's Stability gate. The weight-indicator
// card itself (port/baud/pattern, live reading) now lives on the Weighing
// pane instead (moved by request — it's about the scale feeding that
// screen's own rules, not a generic connection); this pane keeps the
// desktop-only hint plus the mock's own Integrations/Email/SMS/webhook
// cards, which don't depend on a serial indicator being present.
export const ConnectionsPane = () => {
    const { t } = useTranslation();
    const indicator = useIndicator();
    const serial = isSerialIndicatorSource(indicator) ? indicator : null;

    if (!serial) {
        return (
            <div className={styles.grid}>
                <Card
            sticky
            title={<span className="lbl">{t("settings.connections.title")}</span>}>
                    <p className={styles.hint}>{t("settings.connections.desktopOnlyHint")}</p>
                </Card>
                <IntegrationsCard />
                <EmailCard />
                <SmsCard />
                <IntegrationConfigCard />
                <RemoteAccessCard />
            </div>
        );
    }

    return (
        <div className={styles.grid}>
            <IntegrationsCard />
            <EmailCard />
            <SmsCard />
            <RemoteAccessCard />
        </div>
    );
};
