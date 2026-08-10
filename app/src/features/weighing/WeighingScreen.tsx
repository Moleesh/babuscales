import { useEffect, useMemo, useState } from "react";

import { Card } from "@components/Card";
import { getMaterialRate } from "@db/materialBody";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { useMasterCache } from "@db/useMasterCache";
import { computeCharge, computeValue } from "@engines/billing";
import { createEmailSource } from "@engines/email/createEmailSource";
import { useIndicator, useIndicatorReading } from "@engines/indicator";
import { buildSlipData } from "@engines/print";
import { createSmsSource } from "@engines/sms/createSmsSource";
import { useVerificationUrl } from "@engines/verification";
import { computeCameraBurnIn, CAMERA_SLOTS, CameraGrid } from "@features/cameras";
import { useSettings } from "@features/settings";

import { ActionsCard } from "./_private/ActionsCard";
import { buildRecallOffers } from "./_private/buildRecallOffers";
import { CalcCard } from "./_private/CalcCard";
import { PrintPreviewModal } from "./_private/PrintPreviewModal";
import { TicketFieldsCard } from "./_private/TicketFieldsCard";
import { OpenTicketStrip } from "./OpenTicketStrip";
import { listOpenTickets } from "./recall";
import type { OpenTicketSummary } from "./recall";
import { formatTicketNo } from "./ticketNumber";
import type { UseWeighingTicket } from "./useWeighingTicket";
import styles from "./WeighingScreen.module.css";

const formatStamp = (iso: string | undefined): string =>
    iso ? new Date(iso).toLocaleString() : "—";

export interface WeighingScreenProps {
    /** Lifted to Shell (PLAN §13.1) so Reports can resume a ticket into the same deck across a tab switch. */
    ticket: UseWeighingTicket;
    /**
     * `useLicense().isGated` (task #38) — the one place licence state
     * actually changes what the operator can do: a lapsed trial or invalid
     * code blocks new captures and Save, but never touches an
     * already-open ticket's fields, Reports, Dashboard or Masters — those
     * stay fully readable (and Print still works for whatever was already
     * saved) so a lapsed licence never locks an operator out of data
     * they're entitled to see, only out of adding more of it.
     */
    licenseGated: boolean;
}

// PLAN §7 end to end: an ordered capture array (§7.1), a stability-gated
// deck (§13), one status derived from the weights (§7.4), the open-ticket
// strip so many lorries can be in flight at once (§7.5), a simplified
// recall banner (§9.2), and the mock's own `camCard` sidebar (a decorative
// preview tied to this same ticket state — @features/cameras). Real
// print-template editing is a separate, not-yet-built feature
// (app/README.md known gap) — this screen does not render it.
export const WeighingScreen = ({ ticket, licenseGated }: WeighingScreenProps) => {
    const db = useDataPort();
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const { settings } = useSettings();
    // Task #42 — no shared status to poll (see @engines/email's own
    // comment), so this is created once here exactly like @engines/print's
    // stateless helpers, not threaded through a Context.
    const [email] = useState(() => createEmailSource());
    // Task #43 — same reasoning, one instance for this screen's lifetime.
    const [sms] = useState(() => createSmsSource());

    const [allTicketDocs, setAllTicketDocs] = useState<DocRow[]>([]);
    const [refreshToken, setRefreshToken] = useState(0);
    const [printModalOpen, setPrintModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (!cancelled) setAllTicketDocs(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [db, refreshToken]);

    const vehicleCache = useMasterCache("Vehicle");
    const partyCache = useMasterCache("Party");
    const materialCache = useMasterCache("Material");
    const transporterCache = useMasterCache("Transporter");
    const storedTareCache = useMasterCache("StoredTare");

    const openTickets = useMemo(
        () => listOpenTickets(allTicketDocs).filter((t) => t.doc.DocId !== ticket.docId),
        [allTicketDocs, ticket.docId],
    );

    const handleResume = (summary: OpenTicketSummary): void => {
        ticket.resume(summary.doc);
    };

    const handleSave = async (): Promise<void> => {
        await ticket.save();
        setRefreshToken((n) => n + 1);
    };

    // Task #46: `!!ticket.kind` alone is the right gate — `defaultCaptureKind`
    // (@db/ticketBody) already returns null exactly when nothing more should
    // be captured, and null out was the old `captures.length < 2`'s whole
    // job. Dropping that clause is what lets a second (third, ...) Gross
    // stay capturable when Settings → Weighing → Rules.MultiGross is on.
    const armed =
        reading.Stable && reading.WeightKg > 0 && !!ticket.kind && !ticket.isLocked && !licenseGated;

    // Rules.AutoCapture (mock: `if (rules.autoCapture) setTimeout(capture, 350)`,
    // fired once per settle) — the deck's own tick loop stops the instant it
    // reports Stable, so `reading.WeightKg` is steady for the lifetime of this
    // effect; nothing re-triggers the timer until the next `armed` transition.
    useEffect(() => {
        if (!armed || !settings.Rules.AutoCapture) return;
        const timer = setTimeout(() => ticket.capture(reading.WeightKg), 350);
        return () => clearTimeout(timer);
    }, [armed, settings.Rules.AutoCapture, reading.WeightKg, ticket]);

    const recallOffers = useMemo(
        () =>
            buildRecallOffers({
                ticket,
                allTicketDocs,
                storedTareCache,
                strictTare: settings.Rules.StrictTare,
            }),
        [ticket, allTicketDocs, storedTareCache, settings.Rules.StrictTare],
    );

    const charge = computeCharge(ticket.weights.netKg !== null);
    const materialRate = getMaterialRate(
        materialCache.rows.find((row) => row.Name === ticket.fields.material)?.Body ?? {},
    );
    const value = computeValue(ticket.weights.netKg, materialRate);

    // PLAN §18 — the printed slip's own QR points at this ticket's page on
    // the local verification server (@engines/verification), null until
    // the ticket has a DocId (a fresh, unsaved ticket has nothing to
    // verify yet) or while the server itself is off/unavailable.
    const verifyBase = useVerificationUrl(settings.Integrations.qr);
    const verifyUrl = verifyBase && ticket.docId ? `${verifyBase}/v/${ticket.docId}` : null;

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
    // (app/README.md known gap, same as the other seven Integrations
    // rows).
    // Task #42 — same outbox-first shape as the Verification job above, but
    // this channel doesn't wait for a worker: it attempts the send right
    // away and immediately reconciles the row to Sent/Failed, a "drain of
    // one" rather than the full background worker every Integrations
    // channel still needs (app/README.md known gap). Only enqueued when the
    // party actually has an e-mail on file — an empty Masters record just
    // means no job, not a Failed one.
    const sendTicketEmail = async (): Promise<void> => {
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

    // Task #43 — same "drain of one" shape as sendTicketEmail just above,
    // over the GSM modem instead of SMTP. Only enqueued when the party has
    // a Phone on file — same "no job, not a Failed one" rule as e-mail.
    const sendTicketSms = async (): Promise<void> => {
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
        await sendTicketEmail();
        await sendTicketSms();
        setRefreshToken((n) => n + 1);
    };

    const slipData = useMemo(
        () =>
            buildSlipData({
                ticketNo: formatTicketNo(ticket.docSeq),
                vehicleNo: ticket.fields.vehicleNo,
                party: ticket.fields.party,
                material: ticket.fields.material,
                challanNo: ticket.fields.challanNo,
                transporter: ticket.fields.transporter,
                tareKg: ticket.weights.tareKg,
                grossKg: ticket.weights.grossKg,
                netKg: ticket.weights.netKg,
                tareAt: ticket.captures.find((c) => c.Type === "Tare")?.At ?? null,
                // Task #46 — the slip's own layout has one Gross line (no
                // itemised per-load breakdown, app/README.md known gap), so a
                // multi-gross ticket shows its LAST Gross's timestamp here —
                // "when this ticket's weighing finished" reads better on a
                // printed slip than "when the first of several loads did."
                grossAt: ticket.captures.filter((c) => c.Type === "Gross").at(-1)?.At ?? null,
                operator: settings.OperatorName,
                printCount: ticket.printCount,
                charge,
                amountDp: settings.Formats.AmountDp,
                verifyUrl,
            }),
        [ticket, settings.OperatorName, settings.Formats.AmountDp, charge, verifyUrl],
    );

    const cameraBurnIn = computeCameraBurnIn(ticket.docSeq, ticket.captures);
    const configuredCameraCount = CAMERA_SLOTS.filter((slot) => slot.configured).length;

    const ticketDate = formatStamp(ticket.captures[0]?.At);
    // Task #46: gate the "done" branch on `!ticket.kind`, not `isComplete` —
    // under MultiGross, isComplete goes true after the first Gross and stays
    // true while more loads are still capturable, but `kind` only turns null
    // once the operator has actually run out of things to capture.
    const captureLabel = !ticket.kind
        ? "Both weights captured"
        : ticket.kind === "Gross"
          ? settings.Rules.MultiGross && ticket.isComplete
              ? "Capture another Gross"
              : "Capture Gross"
          : "Capture Tare";
    const captureHint = !ticket.kind
        ? "Save to finish this ticket"
        : armed
          ? "Stable — capture now"
          : "Waiting for a stable reading";

    return (
        <div className={styles.screen}>
            <OpenTicketStrip tickets={openTickets} onResume={handleResume} />
            <div className={styles.layout}>
                <div className={styles.col}>
                    <TicketFieldsCard
                        ticket={ticket}
                        ticketDate={ticketDate}
                        recallOffers={recallOffers}
                        vehicleCache={vehicleCache}
                        partyCache={partyCache}
                        materialCache={materialCache}
                        transporterCache={transporterCache}
                    />
                    <CalcCard
                        weights={ticket.weights}
                        captures={ticket.captures}
                        charge={charge}
                        materialRate={materialRate}
                        value={value}
                        amountDp={settings.Formats.AmountDp}
                    />
                </div>

                <div className={styles.col}>
                    <ActionsCard
                        ticket={ticket}
                        reading={reading}
                        loadLorry={indicator.loadLorry}
                        multiGross={settings.Rules.MultiGross}
                        armed={armed}
                        gated={licenseGated}
                        captureLabel={captureLabel}
                        captureHint={captureHint}
                        onSave={() => void handleSave()}
                        onOpenPrintModal={() => setPrintModalOpen(true)}
                    />

                    <Card
                        title={<span className="lbl">Cameras</span>}
                        headerRight={
                            <span className="chip">
                                {configuredCameraCount} of {CAMERA_SLOTS.length} configured
                            </span>
                        }
                    >
                        <CameraGrid
                            vehicleNo={ticket.fields.vehicleNo}
                            burnIn={cameraBurnIn}
                            variant="sidebar"
                        />
                    </Card>
                </div>
            </div>
            <PrintPreviewModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                data={slipData}
                onSend={() => void handlePrint()}
                sending={ticket.saving}
            />
        </div>
    );
};
