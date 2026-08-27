import { formatWeightKg } from "@constants/numberFormat";
import type { IndicatorReading } from "@engines/indicator";

import styles from "./_styles/ConnectionsPane.module.css";

export interface IndicatorStatusFieldsProps {
    refreshing: boolean;
    onRescan: () => void;
    error: string | null;
    reading: IndicatorReading;
    conn: { IndicatorPort: string };
}

// Split out of IndicatorCard (over the line budget — docs/CodingStandards.md)
// — the Rescan row and live reading, unchanged from the inline version it
// replaces. Task: "we can also remove Custom pattern (advanced)" — its own
// field used to live here; `IndicatorPattern` stays in settingsSchema.ts
// (existing saved settings, and useIndicatorPortMonitor's Listen call, both
// still reference it) but there's no UI to set it anymore.
export const IndicatorStatusFields = ({ refreshing, onRescan, error, reading, conn }: IndicatorStatusFieldsProps) => {
    return (
    <>
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
