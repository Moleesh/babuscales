import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/ConnectionsPane.module.css";
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
    const { t } = useTranslation();
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
            title={<span className="lbl">{t("settings.email.title")}</span>}
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
                    label={t("settings.email.testSendLabel")}
                    type="email"
                    placeholder="you@example.com"
                    value={testTo}
                    setValue={setTestTo}
                    unlocked={unlocked}
                    sending={sending}
                    buttonLabel={t("settings.email.sendTest")}
                    onSend={() => void sendTest()}
                />
                <p className={styles.hint}>{t("settings.email.hint")}</p>
            </div>
        </Card>
    );
};
