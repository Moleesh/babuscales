import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
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
                <Select
                    id="gsmPort"
                    value={conn.GsmPort}
                    options={[{ value: "", label: "Not connected" }, ...ports.map((port) => ({ value: port, label: port }))]}
                    disabled={!unlocked}
                    onChange={(value) => onSave({ ...settings, Connections: { ...conn, GsmPort: value } })}
                />
            </Field>
            <Field id="gsmBaud" label={t("settings.baudRate")}>
                <Select
                    id="gsmBaud"
                    value={String(conn.GsmBaud)}
                    options={BAUD_RATE_OPTIONS.map((baud) => ({ value: String(baud), label: String(baud) }))}
                    disabled={!unlocked}
                    onChange={(value) =>
                        onSave({ ...settings, Connections: { ...conn, GsmBaud: Number(value) } })
                    }
                />
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
