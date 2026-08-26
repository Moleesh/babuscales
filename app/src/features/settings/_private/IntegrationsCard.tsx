import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { INTEGRATION_FIXTURES } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./_styles/ConnectionsPane.module.css";
import { IntegrationRow } from "./IntegrationRow";
import { useFlashMessage } from "./useFlashMessage";
import { useIntegrationsActions } from "./useIntegrationsActions";

// Split out of ConnectionsPane (over the line budget — docs/CodingStandards.md)
// — the mock's own Integrations fixture list, unchanged from the inline
// version it replaces.
export const IntegrationsCard = () => {
    const { settings, unlocked, save } = useSettings();
    const { flash, showFlash } = useFlashMessage();
    const { toggle, configure } = useIntegrationsActions({ settings, save, showFlash });
    const { t } = useTranslation();

    return (
        <Card
            sticky
            title={<span className="lbl">{t("settings.integrations.title")}</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.tpls}>
                {INTEGRATION_FIXTURES.map((fixture) => (
                    <IntegrationRow
                        key={fixture.key}
                        fixture={fixture}
                        on={settings.Integrations[fixture.key]}
                        unlocked={unlocked}
                        onToggle={() => toggle(fixture.key, fixture.name)}
                        onConfigure={() => void configure(fixture)}
                    />
                ))}
            </div>
        </Card>
    );
};
