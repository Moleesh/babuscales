import { useState } from "react";

import { Card } from "@components/Card";
import { useDataPort } from "@db/useDataPort";
import { createEmailSource } from "@engines/email/createEmailSource";

import { useSettings } from "../useSettings";
import { DailySummaryScheduleFields } from "./DailySummaryScheduleFields";
import styles from "./SystemPane.module.css";
import { useDailySummarySend } from "./useDailySummarySend";

// Task #45 — PLAN §18's "scheduled daily summary", the manual half:
// `DailySummarySync` (App.tsx) is the automatic half, checking once a
// minute whether it's time to send; this card configures what it sends to
// and when, plus a "Send now" button that runs the exact same
// build-and-send path on demand — both the fastest way to confirm the SMTP
// relay and recipient are right, and a real manual trigger in its own
// right (e.g. an admin who wants today's numbers before the scheduled
// time). `Enabled`/`Time`/`Recipient` are admin configuration, gated by
// `unlocked` like every other field on this pane; `LastSentDate` is not —
// it goes through `recordDailySummarySent` instead (see that context
// method's own doc comment).
export const DailySummaryCard = () => {
    const db = useDataPort();
    const { settings, unlocked, save, recordDailySummarySent } = useSettings();
    const [email] = useState(() => createEmailSource());
    const { sending, flash, handleSendNow } = useDailySummarySend({
        db,
        email,
        settings,
        recordDailySummarySent,
    });
    const cfg = settings.DailySummary;

    return (
        <Card
            title={<span className="lbl">Scheduled daily summary</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <DailySummaryScheduleFields
                    settings={settings}
                    cfg={cfg}
                    unlocked={unlocked}
                    onSave={(next) => void save(next)}
                />
                <div className={styles.confirmRow}>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={!unlocked || sending || !cfg.Recipient.trim()}
                        onClick={() => void handleSendNow()}
                    >
                        {sending ? "Sending…" : "Send now"}
                    </button>
                </div>
                <p className={styles.hint}>
                    Goes out over the same SMTP relay as ticket e-mail (Connections → E-mail
                    delivery) — set that up first. This only runs while the app is open: it checks
                    once a minute for the scheduled time, there is no background service, so a
                    machine that&apos;s off (or asleep) at the scheduled time sends nothing until
                    it&apos;s next opened.
                    {cfg.LastSentDate && ` Last sent: ${cfg.LastSentDate}.`}
                </p>
            </div>
        </Card>
    );
};
