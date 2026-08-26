import { useState } from "react";

import { Card } from "@components/Card";
import { useDataPort } from "@db/useDataPort";
import { createEmailSource } from "@engines/email/createEmailSource";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/SystemPane.module.css";
import { DailySummaryScheduleFields } from "./DailySummaryScheduleFields";
import { useDailySummarySend } from "./useDailySummarySend";

// The "scheduled daily summary", the manual half:
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
    const { t } = useTranslation();
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
            sticky
            title={<span className="lbl">{t("settings.dailySummary.title")}</span>}
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
                        {sending ? t("settings.dailySummary.sending") : t("settings.dailySummary.sendNow")}
                    </button>
                </div>
                <p className={styles.hint}>
                    {t("settings.dailySummary.hint")}
                    {cfg.LastSentDate && ` ${t("settings.dailySummary.lastSent")} ${cfg.LastSentDate}.`}
                </p>
            </div>
        </Card>
    );
};
