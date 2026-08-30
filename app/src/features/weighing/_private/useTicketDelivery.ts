import { useToast } from "@components/Toast";
import { useDataPort } from "@db/useDataPort";
import type { UseMasterCache } from "@db/useMasterCache";
import type { EmailSource } from "@engines/email/types";
import { reconcileOutboxOutcome } from "@engines/outbox";
import type { SmsSource } from "@engines/sms/types";
import { todayLocalDate } from "@features/reports/dailySummaryEmail";
import type { SettingsBody } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import { formatTicketNo } from "../ticketNumber";
import type { UseWeighingTicket } from "../useWeighingTicket";

export interface UseTicketDeliveryArgs {
    ticket: UseWeighingTicket;
    email: EmailSource;
    sms: SmsSource;
    settings: SettingsBody;
    partyCache: UseMasterCache;
    /** The local verification server URL for this exact ticket, null until it has a DocId or the integration is off — see WeighingScreen's own `verifyUrl` comment. */
    verifyUrl: string | null;
    /** Same charge WeighingScreen's own CalcCard already shows — computeTicketBilling's output, reused here rather than recomputed. */
    chargeInr: number | null;
    /** Bumps WeighingScreen's `refreshToken` so the open-ticket strip picks up whatever `print()` just changed. */
    onDelivered: () => void;
}

type Db = ReturnType<typeof useDataPort>;

interface EmailDeps {
    ticket: UseWeighingTicket;
    email: EmailSource;
    settings: SettingsBody;
    partyCache: UseMasterCache;
    verifyUrl: string | null;
    db: Db;
}

// Task #42 — same outbox-first shape as the Verification job in handlePrint
// below, but this channel doesn't wait for a worker: it attempts the send
// right away and immediately reconciles the row to Sent/Failed, a "drain of
// one" rather than the full background worker every Integrations channel
// used to need (app/README.md's known gap, closed by useOutboxWorker.ts —
// that worker is what actually retries a `Failed` row's `NextTryAt`, set by
// `reconcileOutboxOutcome` (outboxBackoff.ts), using this exact same `email.send` shape so a
// stored row round-trips correctly). Only enqueued when the party actually
// has an e-mail on file — an empty Masters record just means no job, not a
// Failed one. A plain async function, not a hook — nothing here calls a
// hook, so it lives at module scope instead of adding to
// useTicketDelivery's own line count.
const sendTicketEmail = async ({ ticket, email, settings, partyCache, verifyUrl, db }: EmailDeps): Promise<void> => {
    if (!settings.Integrations.email || !ticket.docId) return;
    const party = partyCache.rows.find((row) => row.Name === ticket.fields.party);
    const to = typeof party?.Body.Email === "string" ? party.Body.Email.trim() : "";
    if (!to) return;
    const ticketNo = formatTicketNo(ticket.docSeq);
    const outboxRow = await db.enqueueOutbox({
        Channel: "Email",
        Body: { DocId: ticket.docId, TicketNo: ticketNo, To: to },
    });
    const result = await email.send({
        host: settings.Smtp.Host,
        port: settings.Smtp.Port,
        username: settings.Smtp.Username,
        to,
        subject: `BabuScales ticket ${ticketNo}`,
        body: [
            `Ticket ${ticketNo} for ${ticket.fields.vehicleNo || "—"} (${ticket.fields.material || "—"}).`,
            ticket.weights.netKg !== null ? `Net weight: ${ticket.weights.netKg} kg.` : null,
            verifyUrl ? `Verify: ${verifyUrl}` : null,
        ]
            .filter(Boolean)
            .join("\n"),
    });
    await db.updateOutbox(outboxRow.OutboxId, reconcileOutboxOutcome(result, outboxRow.Attempts, Date.now()));
};

interface SmsDeps {
    ticket: UseWeighingTicket;
    sms: SmsSource;
    settings: SettingsBody;
    partyCache: UseMasterCache;
    db: Db;
}

// Task #43 — same "drain of one" shape as sendTicketEmail just above, over
// the GSM modem instead of SMTP. Only enqueued when the party has a Phone
// on file — same "no job, not a Failed one" rule as e-mail.
const sendTicketSms = async ({ ticket, sms, settings, partyCache, db }: SmsDeps): Promise<void> => {
    if (!settings.Integrations.sms || !ticket.docId) return;
    const party = partyCache.rows.find((row) => row.Name === ticket.fields.party);
    const to = typeof party?.Body.Phone === "string" ? party.Body.Phone.trim() : "";
    if (!to) return;
    const ticketNo = formatTicketNo(ticket.docSeq);
    const outboxRow = await db.enqueueOutbox({
        Channel: "Sms",
        Body: { DocId: ticket.docId, TicketNo: ticketNo, To: to },
    });
    const result = await sms.send({
        port: settings.Connections.GsmPort,
        baud: settings.Connections.GsmBaud,
        to,
        message: [
            `BabuScales ticket ${ticketNo} — ${ticket.fields.vehicleNo || "—"} (${ticket.fields.material || "—"}).`,
            ticket.weights.netKg !== null ? `Net: ${ticket.weights.netKg} kg.` : null,
        ]
            .filter(Boolean)
            .join(" "),
    });
    await db.updateOutbox(outboxRow.OutboxId, reconcileOutboxOutcome(result, outboxRow.Attempts, Date.now()));
};

interface WebhookDeps {
    ticket: UseWeighingTicket;
    settings: SettingsBody;
    chargeInr: number | null;
    db: Db;
}

// The first of three brand-new channels no call site
// enqueued before now: unlike Email/Sms above, Webhook/Tally/Board
// have no pre-existing "drain of one" to extend, so this one enqueues and
// leaves the actual send to useOutboxWorker.ts (there is no per-channel
// "try immediately" shortcut here — the worker's next tick, at most 30s
// away, is fast enough that adding one is not worth the duplicated
// send/reconcile logic). Gated the same "no job, not a Failed one" way as
// email/sms: off, or no endpoint configured, means nothing is enqueued.
const enqueueTicketWebhook = async ({ ticket, settings, chargeInr, db }: WebhookDeps): Promise<void> => {
    if (!settings.Integrations.webhook || !settings.Webhook.Endpoint || !ticket.docId) return;
    await db.enqueueOutbox({
        Channel: "Webhook",
        Body: {
            DocId: ticket.docId,
            TicketNo: formatTicketNo(ticket.docSeq),
            VehicleNo: ticket.fields.vehicleNo,
            Material: ticket.fields.material,
            Party: ticket.fields.party,
            NetKg: ticket.weights.netKg,
            ChargeInr: chargeInr,
        },
    });
};

interface TallyDeps {
    ticket: UseWeighingTicket;
    settings: SettingsBody;
    chargeInr: number | null;
    db: Db;
}

const enqueueTicketTally = async ({ ticket, settings, chargeInr, db }: TallyDeps): Promise<void> => {
    if (!settings.Integrations.tally || !settings.Tally.Folder || !ticket.docId) return;
    await db.enqueueOutbox({
        Channel: "Tally",
        Body: {
            DocId: ticket.docId,
            TicketNo: formatTicketNo(ticket.docSeq),
            Date: todayLocalDate(),
            VehicleNo: ticket.fields.vehicleNo,
            Party: ticket.fields.party,
            Material: ticket.fields.material,
            NetKg: ticket.weights.netKg,
            ChargeInr: chargeInr,
        },
    });
};

interface BoardDeps {
    ticket: UseWeighingTicket;
    settings: SettingsBody;
    db: Db;
}

const enqueueTicketBoard = async ({ ticket, settings, db }: BoardDeps): Promise<void> => {
    if (!settings.Integrations.board || !settings.Board.Host || !ticket.docId) return;
    await db.enqueueOutbox({
        Channel: "Board",
        Body: { DocId: ticket.docId, TicketNo: formatTicketNo(ticket.docSeq), NetKg: ticket.weights.netKg },
    });
};

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — everything added on top of a bare
// `ticket.print()`: enqueueing the QR verification job, attempting Email
// and SMS in turn (each an outbox "drain of one", see sendTicketEmail/
// sendTicketSms above), and enqueueing Webhook/Tally/Board for
// useOutboxWorker.ts to pick up. Not a from-scratch design: the first five
// of these are the same call sites that used to live inline in
// WeighingScreen's `handlePrint`, moved here as one unit since none of them
// ever fires without the others being considered.
export const useTicketDelivery = ({
    ticket,
    email,
    sms,
    settings,
    partyCache,
    verifyUrl,
    chargeInr,
    onDelivered,
}: UseTicketDeliveryArgs) => {
    const db = useDataPort();
    const { showToast } = useToast();
    const { t } = useTranslation();

    // "All integrations... through the durable outbox, so none
    // can delay or lose a ticket." The LAN verification page itself needs
    // no queuing (the server reads the doc straight from the DB on
    // every hit) — this row exists for whatever eventually makes that page
    // reachable *publicly* (a Cloudflare Tunnel), so that work has
    // something durable to consume the moment it exists, rather than
    // needing its own detection of "which tickets were printed with a QR."
    // Only enqueued when a real VerifyUrl was actually printed — no job
    // for a slip that carried no QR (feature off, or printed before the
    // ticket had a DocId). Deliberately never drained by useOutboxWorker.ts
    // — see that file's own comment on why "Verification" rows are left
    // alone.
    const handlePrint = async (): Promise<void> => {
        // ticket.print() had no failure feedback — same "silent success"
        // gap as handleSave (useWeighingScreenTickets.ts) had, and here it
        // also aborted the rest of delivery (email/SMS/webhook enqueue)
        // with no indication why.
        try {
            await ticket.print();
        } catch (err) {
            console.error("Ticket print failed", err);
            showToast(t("components.toast.printFailed"));
            return;
        }
        if (verifyUrl && ticket.docId) {
            await db.enqueueOutbox({
                Channel: "Verification",
                Body: {
                    DocId: ticket.docId,
                    TicketNo: formatTicketNo(ticket.docSeq),
                    VerifyUrl: verifyUrl,
                },
            });
        }
        await sendTicketEmail({ ticket, email, settings, partyCache, verifyUrl, db });
        await sendTicketSms({ ticket, sms, settings, partyCache, db });
        await enqueueTicketWebhook({ ticket, settings, chargeInr, db });
        await enqueueTicketTally({ ticket, settings, chargeInr, db });
        await enqueueTicketBoard({ ticket, settings, db });
        onDelivered();
    };

    return { handlePrint };
};
