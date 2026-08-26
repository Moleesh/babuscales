import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/ConnectionsPane.module.css";
import { RemoteAccessTokenFields } from "./RemoteAccessTokenFields";
import { useRemoteAccessConnection } from "./useRemoteAccessConnection";

// Its own separate "Remote access — Cloudflare Tunnel" spec — not
// one of the mock's INTEGRATIONS fixtures (it isn't in demo/BabuScales-demo.html
// at all), so it gets its own card rather than a ninth IntegrationRow.
// `RemoteAccess.Enabled` is the one part of "on or off" that is ordinary
// config, same shape as every other Settings toggle — see
// useRemoteAccessConnection for the token/connection logic.
export const RemoteAccessCard = () => {
    const { settings, unlocked, save } = useSettings();
    const { t } = useTranslation();
    const {
        enabled,
        tokenInput,
        setTokenInput,
        hasToken,
        flash,
        toggleEnabled,
        saveToken,
        clearToken,
        checkStatus,
    } = useRemoteAccessConnection({ settings, save });

    return (
        <Card
            title={<span className="lbl">{t("settings.remoteAccess.title")}</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <div className={styles.statusRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked}
                        onClick={toggleEnabled}
                    >
                        {enabled ? t("settings.remoteAccess.turnOff") : t("settings.remoteAccess.turnOn")}
                    </button>
                    <span className={enabled ? styles.statusOk : styles.hint}>
                        {enabled ? t("settings.remoteAccess.enabled") : t("settings.remoteAccess.disabled")}{" "}
                        — {t("settings.remoteAccess.optInSuffix")}
                    </span>
                </div>
                <RemoteAccessTokenFields
                    tokenInput={tokenInput}
                    setTokenInput={setTokenInput}
                    hasToken={hasToken}
                    unlocked={unlocked}
                    onSaveToken={() => void saveToken()}
                    onClearToken={() => void clearToken()}
                    onCheckStatus={() => void checkStatus()}
                />
                <p className={styles.hint}>{t("settings.remoteAccess.hint")}</p>
            </div>
        </Card>
    );
};
