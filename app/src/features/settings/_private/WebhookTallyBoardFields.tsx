import type { SettingsBody } from "../settingsSchema";
import styles from "./_styles/ConnectionsPane.module.css";
import { BoardFields } from "./BoardFields";
import { TallyFields } from "./TallyFields";
import { WebhookFields } from "./WebhookFields";

export interface WebhookTallyBoardFieldsProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of IntegrationConfigCard (over the line budget —
// docs/CodingStandards.md) — the three small per-channel field groups, one
// per new outbox-worker-task channel, further split into their own files
// (WebhookFields/TallyFields/BoardFields) for the same reason. Same "native
// inputs, same style as SMTP/GSM" shape as EmailHostFields/SmsPortFields —
// no new components.
export const WebhookTallyBoardFields = ({ settings, unlocked, onSave }: WebhookTallyBoardFieldsProps) => (
    <>
        <p className={styles.hint}>Webhook / REST</p>
        <WebhookFields settings={settings} unlocked={unlocked} onSave={onSave} />

        <p className={styles.hint}>Accounting export (CSV)</p>
        <TallyFields settings={settings} unlocked={unlocked} onSave={onSave} />

        <p className={styles.hint}>Outdoor display board</p>
        <BoardFields settings={settings} unlocked={unlocked} onSave={onSave} />
    </>
);
