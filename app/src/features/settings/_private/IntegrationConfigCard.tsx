import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/ConnectionsPane.module.css";
import { WebhookTallyBoardFields } from "./WebhookTallyBoardFields";

// Outbox-worker task — real (if minimal) delivery config for the Webhook,
// Tally and Board Integrations rows, same "own Card, not just the mock's
// decorative 'Configure' stub" shape as EmailCard/SmsCard before it (see
// IntegrationsCard's own doc comment on why WhatsApp/Cloud backup/QR stay
// decorative there while these three graduate here). No password/test-send
// button: unlike SMTP, none of these three channels has a secret that
// belongs in the OS credential store (the webhook secret is an ordinary
// HMAC key, sent as a header value, not used to authenticate a login), and
// there's no "send now" shortcut — useOutboxWorker.ts's own 30s poll is the
// only path any of these three channels drain through (see
// useTicketDelivery.ts's enqueueTicketWebhook/enqueueTicketTally/
// enqueueTicketBoard for why there's no "drain of one" here either).
export const IntegrationConfigCard = () => {
    const { settings, unlocked, save } = useSettings();
    const { t } = useTranslation();

    return (
        <Card
            sticky
            title={<span className="lbl">{t("settings.integrationConfig.title")}</span>}>
            <div className={styles.body}>
                <WebhookTallyBoardFields
                    settings={settings}
                    unlocked={unlocked}
                    onSave={(next) => void save(next)}
                />
                <p className={styles.hint}>{t("settings.integrationConfig.hint")}</p>
            </div>
        </Card>
    );
};
