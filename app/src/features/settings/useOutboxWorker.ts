import { useEffect, useState } from "react";

import type { JsonRecord, OutboxRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { createEmailSource } from "@engines/email/createEmailSource";
import type { EmailSource } from "@engines/email/types";
import { reconcileOutboxOutcome } from "@engines/outbox";
import type { ChannelSendResult, OutboxChannelSources } from "@engines/outbox";
import { createOutboxChannels } from "@engines/outbox/createOutboxChannels";
import { createSmsSource } from "@engines/sms/createSmsSource";
import type { SmsSource } from "@engines/sms/types";

import type { SettingsBody } from "./settingsSchema";
import { useSettings } from "./useSettings";

const POLL_INTERVAL_MS = 30_000;

/** Every channel this worker knows how to drain. "Verification" is deliberately absent — see `handlePrint`'s own comment (useTicketDelivery.ts) on why those rows wait for a future Cloudflare Tunnel feature instead. Anything else (an unrecognised string some future channel writes) is left untouched, not errored on. */
const DRAINABLE_CHANNELS = ["Email", "Sms", "Webhook", "Tally", "Board"] as const;
type DrainableChannel = (typeof DRAINABLE_CHANNELS)[number];

const isDrainable = (channel: string): channel is DrainableChannel =>
    (DRAINABLE_CHANNELS as readonly string[]).includes(channel);

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

// Email/Sms retry content is deliberately minimal — the outbox `Body` these
// two channels write (useTicketDelivery.ts's sendTicketEmail/sendTicketSms,
// App.tsx's DailySummarySync) only ever carries `To`/`TicketNo` (or, for the
// daily summary, `Kind`/`Date`/`To`), not the full vehicle/material/weight
// detail the original message had on hand — reconstructing that exactly
// would mean re-fetching and re-deriving the ticket from its DocId, which
// is real duplication for a retry message whose whole job is "let the
// recipient know a delivery is still trying," not a byte-for-byte resend.
const emailRetrySubjectBody = (body: JsonRecord): { subject: string; text: string } => {
    if (body.Kind === "DailySummary") {
        const date = asString(body.Date);
        return {
            subject: `BabuScales daily summary — ${date} (retry)`,
            text: `Daily summary for ${date} — delivery retry from the outbox worker.`,
        };
    }
    const ticketNo = asString(body.TicketNo) || "ticket";
    return {
        subject: `BabuScales ${ticketNo} (retry)`,
        text: `Ticket ${ticketNo} — delivery retry from the outbox worker.`,
    };
};

interface RetryDeps {
    settings: SettingsBody;
    email: EmailSource;
    sms: SmsSource;
    channels: OutboxChannelSources;
}

const sendEmailRow = async (body: JsonRecord, { settings, email }: RetryDeps): Promise<ChannelSendResult> => {
    const to = asString(body.To);
    if (!to) return { Ok: false, Error: "outbox row has no To address" };
    const { subject, text } = emailRetrySubjectBody(body);
    return email.send({
        host: settings.Smtp.Host,
        port: settings.Smtp.Port,
        username: settings.Smtp.Username,
        to,
        subject,
        body: text,
    });
};

const sendSmsRow = async (body: JsonRecord, { settings, sms }: RetryDeps): Promise<ChannelSendResult> => {
    const to = asString(body.To);
    if (!to) return { Ok: false, Error: "outbox row has no To address" };
    const ticketNo = asString(body.TicketNo) || "ticket";
    return sms.send({
        port: settings.Connections.GsmPort,
        baud: settings.Connections.GsmBaud,
        to,
        message: `BabuScales ${ticketNo} — delivery retry from the outbox worker.`,
    });
};

const sendWebhookRow = async (body: JsonRecord, { settings, channels }: RetryDeps): Promise<ChannelSendResult> =>
    channels.webhook.send({
        endpoint: settings.Webhook.Endpoint,
        secret: settings.Webhook.Secret,
        payloadJson: JSON.stringify(body),
    });

/** Quotes a CSV field only when it needs it — commas/quotes/newlines — same "smallest thing that works" scope as net::tally's own doc comment (CSV, not a real Tally XML format). */
const csvField = (value: unknown): string => {
    const text =
        typeof value === "string"
            ? value
            : typeof value === "number" || typeof value === "boolean"
              ? String(value)
              : "";
    return /["\n,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const sendTallyRow = async (body: JsonRecord, { settings, channels }: RetryDeps): Promise<ChannelSendResult> => {
    const lineCsv = [
        body.TicketNo,
        body.Date,
        body.VehicleNo,
        body.Party,
        body.Material,
        body.NetKg,
        body.ChargeInr,
    ]
        .map(csvField)
        .join(",");
    return channels.tally.send({ folder: settings.Tally.Folder, lineCsv });
};

const sendBoardRow = async (body: JsonRecord, { settings, channels }: RetryDeps): Promise<ChannelSendResult> => {
    const ticketNo = asString(body.TicketNo) || "?";
    const netKg = typeof body.NetKg === "number" ? body.NetKg : "?";
    return channels.board.send({
        host: settings.Board.Host,
        port: settings.Board.Port,
        text: `${ticketNo} ${netKg}kg`,
    });
};

const SENDERS: Record<
    DrainableChannel,
    (body: JsonRecord, deps: RetryDeps) => Promise<ChannelSendResult>
> = {
    Email: sendEmailRow,
    Sms: sendSmsRow,
    Webhook: sendWebhookRow,
    Tally: sendTallyRow,
    Board: sendBoardRow,
};

const isDueFailedRow = (row: OutboxRow, nowIso: string): boolean =>
    row.State === "Failed" && row.NextTryAt !== null && row.NextTryAt <= nowIso;

// Outbox-worker task — the background worker app/README.md's own "known
// gap" note (and net::outbox's doc-comment stub) has been missing since the
// outbox table itself was built: every channel until now was either a
// "drain of one" attempted once at print/send time (Email, Sms — see
// useTicketDelivery.ts, App.tsx's DailySummarySync) or, for Webhook/Tally/
// Board, never drained at all. This is the one place all five of those
// channels' `Pending` rows, and any `Failed` row whose backoff `NextTryAt`
// (outboxBackoff.ts, now @engines/outbox) has passed, actually get retried.
//
// Same "once a while the app happens to be open" honesty as
// DailySummarySync's own doc comment: a 30s poll, not a real OS-level
// scheduler or push-based queue — this app has neither. `State: "Sending"`
// is written before each attempt as a best-effort guard against a
// pathological double-drain within one process, not a real distributed
// lock (there's only one process to guard against here).
export const useOutboxWorker = (): void => {
    const db = useDataPort();
    const { settings } = useSettings();
    const [email] = useState<EmailSource>(() => createEmailSource());
    const [sms] = useState<SmsSource>(() => createSmsSource());
    const [channels] = useState<OutboxChannelSources>(() => createOutboxChannels());

    useEffect(() => {
        const drainOnce = async (): Promise<void> => {
            const nowIso = new Date().toISOString();
            const [pending, failed] = await Promise.all([
                db.listOutbox({ State: "Pending" }),
                db.listOutbox({ State: "Failed" }),
            ]);
            const due = [...pending, ...failed.filter((row) => isDueFailedRow(row, nowIso))];

            for (const row of due) {
                if (!isDrainable(row.Channel)) continue;
                await db.updateOutbox(row.OutboxId, { State: "Sending" });
                const result = await SENDERS[row.Channel](row.Body, { settings, email, sms, channels });
                await db.updateOutbox(row.OutboxId, reconcileOutboxOutcome(result, row.Attempts));
            }
        };

        const timer = setInterval(() => void drainOnce(), POLL_INTERVAL_MS);
        void drainOnce();
        return () => clearInterval(timer);
    }, [db, settings, email, sms, channels]);
};
