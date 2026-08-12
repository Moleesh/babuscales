import { Field } from "@components/Field";
import { formatWeightKg } from "@constants/numberFormat";
import type { IndicatorReading } from "@engines/indicator";

import type { ConnectionsConfig, SettingsBody } from "../settingsSchema";
import styles from "./_styles/ConnectionsPane.module.css";

export interface IndicatorStatusFieldsProps {
    settings: SettingsBody;
    conn: ConnectionsConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    refreshing: boolean;
    onRescan: () => void;
    error: string | null;
    reading: IndicatorReading;
}

// Split out of IndicatorCard (over the line budget — docs/CodingStandards.md)
// — the custom-pattern field, Rescan row and live reading, unchanged from
// the inline version it replaces.
export const IndicatorStatusFields = ({
    settings,
    conn,
    unlocked,
    onSave,
    refreshing,
    onRescan,
    error,
    reading,
}: IndicatorStatusFieldsProps) => (
    <>
        <Field id="connPattern" label={{ en: "Custom pattern (advanced)", ta: "தனிப்பயன் மாதிரி (மேம்பட்டது)" }}>
            <input
                id="connPattern"
                placeholder="Leave blank to auto-extract the number from each line"
                value={conn.IndicatorPattern}
                disabled={!unlocked}
                onChange={(event) =>
                    onSave({ ...settings, Connections: { ...conn, IndicatorPattern: event.target.value } })
                }
            />
        </Field>
        <div className={styles.statusRow}>
            <button type="button" className={styles.mini} disabled={refreshing} onClick={onRescan}>
                {refreshing ? "Scanning…" : "Rescan ports"}
            </button>
            {conn.IndicatorPort ? (
                error ? (
                    <span className={styles.statusBad}>⚠ {error}</span>
                ) : (
                    <span className={styles.statusOk}>
                        {reading.Stable ? "Reading" : "Connected"} — {formatWeightKg(reading.WeightKg)} kg
                    </span>
                )
            ) : (
                <span className={styles.hint}>No port selected.</span>
            )}
        </div>
        <p className={styles.hint}>
            The pattern is a regex with one capture group around the weight — for
            indicators the built-in numeric extraction can&apos;t parse cleanly (a
            checksum byte or station ID mixed into the same line). Most installations
            leave this blank.
        </p>
    </>
);
