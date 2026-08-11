import { Card } from "@components/Card";

import { useSettings } from "../useSettings";
import styles from "./ConnectionsPane.module.css";
import { EmailSmtpFields } from "./EmailSmtpFields";
import { TestSendField } from "./TestSendField";
import { useEmailDeliveryActions } from "./useEmailDeliveryActions";

// Task #42's real Email/SMTP ticket delivery — not one of the mock's
// INTEGRATIONS fixtures either (its own "Configure" there stays a stub, see
// IntegrationsCard), same reasoning as RemoteAccessCard: the host/port/
// username are ordinary Settings config (`settings.Smtp`), the password
// goes straight to Windows Credential Manager (see
// useEmailDeliveryActions). "Send a test e-mail" is the one way to
// actually prove a relay works short of printing a real ticket.
export const EmailCard = () => {
    const { settings, unlocked, save } = useSettings();
    const {
        passwordInput,
        setPasswordInput,
        hasPassword,
        testTo,
        setTestTo,
        sending,
        flash,
        savePassword,
        clearPassword,
        sendTest,
    } = useEmailDeliveryActions({ settings });

    return (
        <Card
            title={<span className="lbl">E-mail delivery</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <EmailSmtpFields
                    settings={settings}
                    smtp={settings.Smtp}
                    unlocked={unlocked}
                    onSave={(next) => void save(next)}
                    passwordInput={passwordInput}
                    setPasswordInput={setPasswordInput}
                    hasPassword={hasPassword}
                    onSavePassword={() => void savePassword()}
                    onClearPassword={() => void clearPassword()}
                />
                <TestSendField
                    id="smtpTestTo"
                    label="Send a test e-mail to"
                    type="email"
                    placeholder="you@example.com"
                    value={testTo}
                    setValue={setTestTo}
                    unlocked={unlocked}
                    sending={sending}
                    buttonLabel="Send test"
                    onSend={() => void sendTest()}
                />
                <p className={styles.hint}>
                    Read at print time when Integrations → E-mail is on: a ticket&apos;s party
                    needs an E-mail saved in Masters (Settings → Masters → Parties) to receive a
                    copy. Most providers want port 587 with STARTTLS and an app-specific password
                    rather than your normal login password — check your provider&apos;s SMTP
                    documentation if the test above fails.
                </p>
            </div>
        </Card>
    );
};
