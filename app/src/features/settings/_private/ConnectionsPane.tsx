import { useEffect, useState } from "react";

import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { formatWeightKg } from "@constants/numberFormat";
import { isSerialIndicatorSource, useIndicator, useIndicatorReading } from "@engines/indicator";

import { BAUD_RATE_OPTIONS } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./ConnectionsPane.module.css";

// Connections pane (demo/BabuScale-demo.html's `data-pane="conn"`) — PLAN
// §17's setup wizard, scoped down to what one iteration can actually
// deliver and verify: choose a port and baud, an optional custom regex
// pattern for indicators the built-in numeric fallback can't parse
// (src-tauri/src/devices/indicator.rs's `parse_weight`), see the live
// reading once saved. App.tsx's SerialConnectionSync opens/reopens the
// port automatically whenever this saves — "Applied immediately", the
// same shape as the Weighing pane's Stability gate. The full wizard's
// "watch raw bytes live, confirm" steps aren't built: genuinely untestable
// without real hardware in hand, unlike everything else here
// (app/README.md known gap).
export const ConnectionsPane = () => {
    const { settings, unlocked, save } = useSettings();
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const serial = isSerialIndicatorSource(indicator) ? indicator : null;
    const [ports, setPorts] = useState<string[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const conn = settings.Connections;

    useEffect(() => {
        if (!serial) return;
        setRefreshing(true);
        void serial
            .listPorts()
            .then(setPorts)
            .finally(() => setRefreshing(false));
    }, [serial]);

    if (!serial) {
        return (
            <Card title={<span className="lbl">Connections</span>}>
                <p className={styles.hint}>
                    Serial port configuration is only available in the desktop app — this demo (and
                    the GitHub Pages build) has no real hardware to connect to, so the indicator
                    here is always simulated.
                </p>
            </Card>
        );
    }

    const error = serial.getConnectionError();

    const handleRescan = (): void => {
        setRefreshing(true);
        void serial
            .listPorts()
            .then(setPorts)
            .finally(() => setRefreshing(false));
    };

    return (
        <div className={styles.grid}>
            <Card
                title={<span className="lbl">Weight indicator</span>}
                headerRight={<span className={styles.applied}>Applied immediately</span>}
            >
                <div className={styles.body}>
                    <FieldGrid columns={2}>
                        <Field id="connPort" label={{ en: "Serial port" }}>
                            <select
                                id="connPort"
                                value={conn.IndicatorPort}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Connections: {
                                            ...conn,
                                            IndicatorPort: event.target.value,
                                        },
                                    })
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
                        <Field id="connBaud" label={{ en: "Baud rate" }}>
                            <select
                                id="connBaud"
                                value={conn.IndicatorBaud}
                                disabled={!unlocked}
                                onChange={(event) =>
                                    void save({
                                        ...settings,
                                        Connections: {
                                            ...conn,
                                            IndicatorBaud: Number(event.target.value),
                                        },
                                    })
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
                    <Field id="connPattern" label={{ en: "Custom pattern (advanced)" }}>
                        <input
                            id="connPattern"
                            placeholder="Leave blank to auto-extract the number from each line"
                            value={conn.IndicatorPattern}
                            disabled={!unlocked}
                            onChange={(event) =>
                                void save({
                                    ...settings,
                                    Connections: { ...conn, IndicatorPattern: event.target.value },
                                })
                            }
                        />
                    </Field>
                    <div className={styles.statusRow}>
                        <button
                            type="button"
                            className={styles.mini}
                            disabled={refreshing}
                            onClick={handleRescan}
                        >
                            {refreshing ? "Scanning…" : "Rescan ports"}
                        </button>
                        {conn.IndicatorPort ? (
                            error ? (
                                <span className={styles.statusBad}>⚠ {error}</span>
                            ) : (
                                <span className={styles.statusOk}>
                                    {reading.Stable ? "Reading" : "Connected"} —{" "}
                                    {formatWeightKg(reading.WeightKg)} kg
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
                </div>
            </Card>
        </div>
    );
};
