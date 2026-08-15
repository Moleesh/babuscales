import { Field } from "@components/Field";
import { formatWeightKg } from "@constants/numberFormat";
import type { IndicatorReading } from "@engines/indicator";
import { useTranslation } from "@i18n/useTranslation";

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
}: IndicatorStatusFieldsProps) => {
    const { t } = useTranslation();
    return (
    <>
        <Field id="connPattern" label={t("settings.indicator.customPattern")}>
            <input
                id="connPattern"
                placeholder="Leave blank to auto-extract the number from each line"
                value={conn.IndicatorPattern}
                disabled={!unlocked}
                autoComplete="off"
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
                        {/* Deliberately fixed-kg — the live indicator readout, and the
                            indicator hardware always reports kg regardless of Formats.WeightUnit
                            (numberFormat.ts's own comment on formatWeightIn). */}
                        {reading.Stable ? "Reading" : "Connected"} — {formatWeightKg(reading.WeightKg)} kg
                    </span>
                )
            ) : (
                <span className={styles.hint}>No port selected.</span>
            )}
        </div>
    </>
    );
};
