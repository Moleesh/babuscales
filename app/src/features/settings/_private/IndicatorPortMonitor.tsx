import { useTranslation } from "@i18n/useTranslation";

import type { ConnectionsConfig } from "../settingsSchema";
import styles from "./_styles/ConnectionsPane.module.css";
import { useIndicatorPortMonitor } from "./useIndicatorPortMonitor";

export interface IndicatorPortMonitorProps {
    conn: ConnectionsConfig;
    unlocked: boolean;
}

// "give a button which will listen to the port and print in a popup...
// which i can use to get set these values" — the operator's own tool for
// working out an unfamiliar indicator's framing (start/end bytes, line
// terminator, byte order) instead of guessing from a datasheet. Opens the
// port with the pattern field ignored (src-tauri's `RawLinePayload` is
// emitted for every line, parsed or not — devices/indicator.rs) and shows
// exactly what arrived. Deliberately separate from the app's own live
// indicator connection: pressing Listen takes over the one shared serial
// connection (only one can be open at a time — devices/indicator.rs's
// `IndicatorState`), same as saving a new port/baud does via
// SerialConnectionSync; Stop (or leaving the pane) hands it back. The
// open/listen/close plumbing itself lives in useIndicatorPortMonitor.ts.
export const IndicatorPortMonitor = ({ conn, unlocked }: IndicatorPortMonitorProps) => {
    const { t } = useTranslation();
    const { listening, lines, error, logRef, toggle } = useIndicatorPortMonitor(conn);

    return (
        <div className={styles.monitor}>
            <div className={styles.statusRow}>
                <button
                    type="button"
                    className={styles.mini}
                    disabled={!unlocked || !conn.IndicatorPort}
                    onClick={toggle}
                >
                    {listening ? t("settings.indicator.stopListening") : t("settings.indicator.listen")}
                </button>
                {error && <span className={styles.statusBad}>⚠ {error}</span>}
            </div>
            <div className={styles.monitorLog} ref={logRef}>
                {lines.length === 0 ? (
                    <span className={styles.monitorEmpty}>{t("settings.indicator.monitorEmpty")}</span>
                ) : (
                    lines.map((line, index) => <div key={index}>{line}</div>)
                )}
            </div>
        </div>
    );
};
