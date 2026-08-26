import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/ConnectionsPane.module.css";
import { SmsPortFields } from "./SmsPortFields";
import { TestSendField } from "./TestSendField";
import { useSmsDeliveryActions } from "./useSmsDeliveryActions";

// Task #43's real SMS delivery via a serial-attached GSM modem — the same
// "own Card, not one of the mock's INTEGRATIONS fixtures" shape as
// EmailCard, but with its own port/baud picker (like the indicator's on
// ConnectionsPane, reusing BAUD_RATE_OPTIONS) instead of a password: AT
// commands over a local serial port need no auth. "Send a test SMS" is
// the same proof-it-works button as EmailCard's "Send test".
export const SmsCard = () => {
    const { settings, unlocked, save } = useSettings();
    const { t } = useTranslation();
    const conn = settings.Connections;
    const { ports, refreshing, refreshPorts, testTo, setTestTo, sending, flash, sendTest } =
        useSmsDeliveryActions({ conn });

    return (
        <Card
            title={<span className="lbl">{t("settings.sms.title")}</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <SmsPortFields
                    settings={settings}
                    conn={conn}
                    unlocked={unlocked}
                    onSave={(next) => void save(next)}
                    ports={ports}
                    refreshing={refreshing}
                    onRescan={refreshPorts}
                />
                <TestSendField
                    id="gsmTestTo"
                    label={t("settings.sms.testSendLabel")}
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={testTo}
                    setValue={setTestTo}
                    unlocked={unlocked}
                    sending={sending}
                    buttonLabel={t("settings.sms.sendTest")}
                    onSend={() => void sendTest()}
                />
                <p className={styles.hint}>{t("settings.sms.hint")}</p>
            </div>
        </Card>
    );
};
