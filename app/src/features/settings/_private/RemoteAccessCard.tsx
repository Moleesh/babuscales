import { Card } from "@components/Card";

import { useSettings } from "../useSettings";
import styles from "./ConnectionsPane.module.css";
import { RemoteAccessTokenFields } from "./RemoteAccessTokenFields";
import { useRemoteAccessConnection } from "./useRemoteAccessConnection";

// PLAN §18's own separate "Remote access — Cloudflare Tunnel" spec — not
// one of the mock's INTEGRATIONS fixtures (it isn't in demo/BabuScales-demo.html
// at all), so it gets its own card rather than a ninth IntegrationRow.
// `RemoteAccess.Enabled` is the one part of "on or off" that is ordinary
// config, same shape as every other Settings toggle — see
// useRemoteAccessConnection for the token/connection logic.
export const RemoteAccessCard = () => {
    const { settings, unlocked, save } = useSettings();
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
            title={<span className="lbl">Remote access</span>}
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
                        {enabled ? "Turn off" : "Turn on"}
                    </button>
                    <span className={enabled ? styles.statusOk : styles.hint}>
                        {enabled ? "Enabled" : "Disabled"} — opt-in, off by default
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
                <p className={styles.hint}>
                    Republishes the LAN verification page (port 8420) publicly through a tunnel you
                    create on the Cloudflare Zero Trust dashboard — create it there, map a public
                    hostname to http://localhost:8420, then paste its connector token above. The
                    token goes straight to the Windows Credential Manager, never to this app&apos;s
                    database. Requires cloudflared to already be installed and on PATH — this app
                    never downloads it. Only the verification page rides this tunnel today; there is
                    no remote admin surface yet.
                </p>
            </div>
        </Card>
    );
};
