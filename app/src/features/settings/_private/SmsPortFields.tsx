import { Field, FieldGrid } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import { BAUD_RATE_OPTIONS } from "../settingsSchema";
import type { ConnectionsConfig, SettingsBody } from "../settingsSchema";
import styles from "./_styles/ConnectionsPane.module.css";

export interface SmsPortFieldsProps {
    settings: SettingsBody;
    conn: ConnectionsConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    ports: string[];
    refreshing: boolean;
    onRescan: () => void;
}

// Split out of SmsCard (over the line budget — docs/CodingStandards.md) —
// the modem port/baud selects plus Rescan row, unchanged from the inline
// version it replaces.
export const SmsPortFields = ({
    settings,
    conn,
    unlocked,
    onSave,
    ports,
    refreshing,
    onRescan,
}: SmsPortFieldsProps) => {
    const { t } = useTranslation();
    return (
    <>
        <FieldGrid columns={2}>
            <Field id="gsmPort" label={t("settings.sms.serialPort")}>
                <select
                    id="gsmPort"
                    value={conn.GsmPort}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, Connections: { ...conn, GsmPort: event.target.value } })
                    }
                >
                    <option value="">Not connected</option>
                    {ports.map((port) => (
                        <option key={port} value={port}>
                            {port}
                        </option>
                    ))}
                </select>
            </Field>
            <Field id="gsmBaud" label={t("settings.baudRate")}>
                <select
                    id="gsmBaud"
                    value={conn.GsmBaud}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, Connections: { ...conn, GsmBaud: Number(event.target.value) } })
                    }
                >
                    {BAUD_RATE_OPTIONS.map((baud) => (
                        <option key={baud} value={baud}>
                            {baud}
                        </option>
                    ))}
                </select>
            </Field>
        </FieldGrid>
        <div className={styles.statusRow}>
            <button type="button" className={styles.mini} disabled={refreshing} onClick={onRescan}>
                {refreshing ? "Scanning…" : "Rescan ports"}
            </button>
            <span className={conn.GsmPort ? styles.statusOk : styles.hint}>
                {conn.GsmPort ? `Configured — ${conn.GsmPort}` : "No port selected."}
            </span>
        </div>
    </>
    );
};
