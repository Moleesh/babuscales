import { AppModal } from "@components/AppModal";
import { ScrollArea } from "@components/ScrollArea";
import { useIndicator } from "@engines/indicator";
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
    const indicator = useIndicator();
    const { listening, lines, error, overflow, dismissOverflow, logRef, toggle } = useIndicatorPortMonitor(
        conn,
        indicator,
    );

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
            {/* Task: "make the listen open a pop when it reads like 100-500
                char or 19-20 rows" — the operator's own words for what a
                misconfigured/no-terminator indicator's raw output looked
                like on production hardware, driven by
                useIndicatorPortMonitor.ts's `overflow` state (set from
                either the Rust-side `indicator-overflow` cap or the
                20-line-with-zero-readings backstop). */}
            <AppModal
                open={overflow}
                title={t("settings.indicator.overflowTitle")}
                onClose={dismissOverflow}
                closeLabel={t("settings.indicator.overflowClose")}
            >
                <p>{t("settings.indicator.overflowBody")}</p>
            </AppModal>
            {/* Bug: "in settings we have page pretty much all tab has the
                wrong [scroll bar]" — this used to be a plain `overflow-y:
                auto` div using the native OS/browser scrollbar. Now rendered
                through <ScrollArea>, with `logRef` passed through as
                `contentRef` so useIndicatorPortMonitor.ts's existing
                autoscroll-to-newest-line effect (`el.scrollTop =
                el.scrollHeight`) keeps reading/writing the same real
                scrolling DOM node. */}
            <ScrollArea contentRef={logRef} className={styles.monitorLogOuter} contentClassName={styles.monitorLog}>
                {lines.length === 0 ? (
                    <span className={styles.monitorEmpty}>{t("settings.indicator.monitorEmpty")}</span>
                ) : (
                    lines.map((line, index) => <div key={index}>{line}</div>)
                )}
            </ScrollArea>
        </div>
    );
};
