import { Card } from "@components/Card";

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

    return (
        <Card title={<span className="lbl">Webhook · Accounting export · Display board</span>}>
            <div className={styles.body}>
                <WebhookTallyBoardFields
                    settings={settings}
                    unlocked={unlocked}
                    onSave={(next) => void save(next)}
                />
                <p className={styles.hint}>
                    Read once per outbox drain (every ~30s) when the matching Integrations toggle
                    above is on and the field here isn&apos;t blank: a ticket carries its own
                    vehicle/party/material/net-weight/charge to whichever of these three are
                    configured. The accounting export is plain CSV to a local folder, not a Tally
                    XML/proprietary format; the display board is one line of text over a raw TCP
                    socket, not a binary protocol.
                </p>
            </div>
        </Card>
    );
};
