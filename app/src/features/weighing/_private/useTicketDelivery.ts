import { useDataPort } from "@db/useDataPort";
import type { UseMasterCache } from "@db/useMasterCache";
import type { EmailSource } from "@engines/email/types";
import type { SmsSource } from "@engines/sms/types";
import type { SettingsBody } from "@features/settings";

import { formatTicketNo } from "../ticketNumber";
import type { UseWeighingTicket } from "../useWeighingTicket";

export interface UseTicketDeliveryArgs {
    ticket: UseWeighingTicket;
    email: EmailSource;
    sms: SmsSource;
    settings: SettingsBody;
    partyCache: UseMasterCache;
    /** PLAN §18's local verification server URL for this exact ticket, null until it has a DocId or the integration is off — see WeighingScreen's own `verifyUrl` comment. */
    verifyUrl: string | null;
    /** Bumps WeighingScreen's `refreshToken` so the open-ticket strip picks up whatever `print()` just changed. */
    onDelivered: () => void;
}

interface EmailDeps {
    ticket: UseWeighingTicket;
    email: EmailSource;
    settings: SettingsBody;
    partyCache: UseMasterCache;
    verifyUrl: string | null;
    db: ReturnType<typeof useDataPort>;
}

// Task #42 — same outbox-first shape as the Verification job in handlePrint
// below, but this channel doesn't wait for a worker: it attempts the send
// right away and immediately reconciles the row to Sent/Failed, a "drain of
// one" rather than the full background worker every Integrations channel
// still needs (app/README.md known gap). Only enqueued when the party
// actually has an e-mail on file — an empty Masters record just means no
// job, not a Failed one. A plain async function, not a hook — nothing here
// calls a hook, so it lives at module scope instead of adding to
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
    await db.updateOutbox(outboxRow.OutboxId, {
        State: result.Ok ? "Sent" : "Failed",
        Attempts: outboxRow.Attempts + 1,
    });
};

interface SmsDeps {
    ticket: UseWeighingTicket;
    sms: SmsSource;
    settings: SettingsBody;
    partyCache: UseMasterCache;
    db: ReturnType<typeof useDataPort>;
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
    await db.updateOutbox(outboxRow.OutboxId, {
        State: result.Ok ? "Sent" : "Failed",
        Attempts: outboxRow.Attempts + 1,
    });
};

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — everything task #33/#42/#43 add on top of a bare `ticket.print()`:
// enqueueing the QR verification job, then attempting Email and SMS in turn,
// each an outbox "drain of one" (see sendTicketEmail/sendTicketSms above for
// why). Not a from-scratch design: this is the same three call sites that
// used to live inline in WeighingScreen's `handlePrint`, moved here as one
// unit since none of the three ever fires without the other two being
// considered.
export const useTicketDelivery = ({
    ticket,
    email,
    sms,
    settings,
    partyCache,
    verifyUrl,
    onDelivered,
}: UseTicketDeliveryArgs) => {
    const db = useDataPort();

    // PLAN §18 — "all integrations... through the durable outbox, so none
    // can delay or lose a ticket." The LAN verification page itself needs
    // no queuing (task #33's server reads the doc straight from the DB on
    // every hit) — this row exists for whatever eventually makes that page
    // reachable *publicly* (task #36's Cloudflare Tunnel), so that work has
    // something durable to consume the moment it exists, rather than
    // needing its own detection of "which tickets were printed with a QR."
    // Only enqueued when a real VerifyUrl was actually printed — no job
    // for a slip that carried no QR (feature off, or printed before the
    // ticket had a DocId). No worker drains this channel yet
    // (app/README.md known gap, same as the other seven Integrations rows).
    const handlePrint = async (): Promise<void> => {
        await ticket.print();
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
        onDelivered();
    };

    return { handlePrint };
};
