import { Field } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ConnectionsPane.module.css";

export interface RemoteAccessTokenFieldsProps {
    tokenInput: string;
    setTokenInput: (value: string) => void;
    hasToken: boolean;
    unlocked: boolean;
    onSaveToken: () => void;
    onClearToken: () => void;
    onCheckStatus: () => void;
}

// Split out of RemoteAccessCard (over the line budget — docs/CodingStandards.md)
// — the token input plus Save/Clear/Check-status row, unchanged from the
// inline version it replaces.
export const RemoteAccessTokenFields = ({
    tokenInput,
    setTokenInput,
    hasToken,
    unlocked,
    onSaveToken,
    onClearToken,
    onCheckStatus,
}: RemoteAccessTokenFieldsProps) => {
    const { t } = useTranslation();
    return (
    <>
        <Field id="tunnelToken" label={t("settings.remoteAccess.tunnelToken")}>
            <input
                id="tunnelToken"
                type="password"
                autoComplete="off"
                placeholder={
                    hasToken
                        ? "•••••••• saved — paste a new one to replace it"
                        : "Paste the connector token from the Cloudflare dashboard"
                }
                value={tokenInput}
                disabled={!unlocked}
                onChange={(event) => setTokenInput(event.target.value)}
            />
        </Field>
        <div className={styles.statusRow}>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked || !tokenInput.trim()}
                onClick={onSaveToken}
            >
                Save token
            </button>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked || !hasToken}
                onClick={onClearToken}
            >
                Clear token
            </button>
            <button type="button" className={styles.mini} onClick={onCheckStatus}>
                Check status
            </button>
            <span className={hasToken ? styles.statusOk : styles.hint}>
                {hasToken ? "Token saved" : "No token saved"}
            </span>
        </div>
    </>
    );
};
