import { Card } from "@components/Card";

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
    const conn = settings.Connections;
    const { ports, refreshing, refreshPorts, testTo, setTestTo, sending, flash, sendTest } =
        useSmsDeliveryActions({ conn });

    return (
        <Card
            title={<span className="lbl">SMS delivery</span>}
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
                    label="Send a test SMS to"
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={testTo}
                    setValue={setTestTo}
                    unlocked={unlocked}
                    sending={sending}
                    buttonLabel="Send test"
                    onSend={() => void sendTest()}
                />
                <p className={styles.hint}>
                    Read at print time when Integrations → SMS gateway is on: a ticket&apos;s party
                    needs a Phone saved in Masters (Settings → Masters → Parties) to receive a text.
                    Talks to the modem over plain AT commands (AT+CMGF, AT+CMGS) — any GSM modem or
                    phone that exposes a serial/USB AT interface works, no cloud SMS-gateway account
                    needed.
                </p>
            </div>
        </Card>
    );
};
