import { useEffect, useRef, useState } from "react";

import type { DataPort } from "@db/DataPort";
import type { createEmailSource } from "@engines/email/createEmailSource";
import { buildDailySummaryEmail, todayLocalDate } from "@features/reports/dailySummaryEmail";

import type { SettingsBody } from "../settingsSchema";

// Mock's own `flash()` timing, reused from ConnectionsPane's RemoteAccessCard.
const FLASH_MS = 3000;

export interface UseDailySummarySendArgs {
    db: DataPort;
    email: ReturnType<typeof createEmailSource>;
    settings: SettingsBody;
    recordDailySummarySent: (dateIso: string) => Promise<void>;
}

export interface UseDailySummarySend {
    sending: boolean;
    flash: string | null;
    handleSendNow: () => Promise<void>;
}

// Split out of DailySummaryCard (over the line budget — docs/CodingStandards.md)
// — the "Send now" flow (build the summary, enqueue+send the e-mail, record
// it, flash the result), unchanged from the inline version it replaces.
export const useDailySummarySend = ({
    db,
    email,
    settings,
    recordDailySummarySent,
}: UseDailySummarySendArgs): UseDailySummarySend => {
    const [sending, setSending] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cfg = settings.DailySummary;

    useEffect(
        () => () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
        },
        [],
    );

    const showFlash = (message: string): void => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setFlash(message);
        flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
    };

    const handleSendNow = async (): Promise<void> => {
        const to = cfg.Recipient.trim();
        if (!to) return;
        setSending(true);
        try {
            const today = todayLocalDate();
            const docs = await db.listDocs({ DocKind: "Ticket" });
            const { subject, body } = buildDailySummaryEmail(docs, today, settings.Formats.AmountDp);
            const outboxRow = await db.enqueueOutbox({
                Channel: "Email",
                Body: { Kind: "DailySummary", Date: today, To: to },
            });
            const result = await email.send({
                host: settings.Smtp.Host,
                port: settings.Smtp.Port,
                username: settings.Smtp.Username,
                to,
                subject,
                body,
            });
            await db.updateOutbox(outboxRow.OutboxId, {
                State: result.Ok ? "Sent" : "Failed",
                Attempts: outboxRow.Attempts + 1,
            });
            await recordDailySummarySent(today);
            showFlash(result.Ok ? "Sent — today's summary" : `Send failed — ${result.Error}`);
        } finally {
            setSending(false);
        }
    };

    return { sending, flash, handleSendNow };
};
