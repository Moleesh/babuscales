import { useEffect, useMemo, useState } from "react";

import { Card } from "@components/Card";
import { getMaterialRate } from "@db/materialBody";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { useMasterCache } from "@db/useMasterCache";
import { computeCharge, computeValue } from "@engines/billing";
import { useIndicator, useIndicatorReading } from "@engines/indicator";
import { buildSlipData } from "@engines/print";
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
}

// PLAN §7 end to end: an ordered capture array (§7.1), a stability-gated
// deck (§13), one status derived from the weights (§7.4), the open-ticket
// strip so many lorries can be in flight at once (§7.5), a simplified
// recall banner (§9.2), and the mock's own `camCard` sidebar (a decorative
// preview tied to this same ticket state — @features/cameras). Real
// print-template editing is a separate, not-yet-built feature
// (app/README.md known gap) — this screen does not render it.
export const WeighingScreen = ({ ticket }: WeighingScreenProps) => {
    const db = useDataPort();
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const { settings } = useSettings();

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

    const handlePrint = async (): Promise<void> => {
        await ticket.print();
        setRefreshToken((n) => n + 1);
    };

    const armed =
        reading.Stable &&
        reading.WeightKg > 0 &&
        ticket.captures.length < 2 &&
        !!ticket.kind &&
        !ticket.isLocked;

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
                grossAt: ticket.captures.find((c) => c.Type === "Gross")?.At ?? null,
                operator: settings.OperatorName,
                printCount: ticket.printCount,
                charge,
                amountDp: settings.Formats.AmountDp,
            }),
        [ticket, settings.OperatorName, settings.Formats.AmountDp, charge],
    );

    const cameraBurnIn = computeCameraBurnIn(ticket.docSeq, ticket.captures);
    const configuredCameraCount = CAMERA_SLOTS.filter((slot) => slot.configured).length;

    const ticketDate = formatStamp(ticket.captures[0]?.At);
    const captureLabel = ticket.isComplete
        ? "Both weights captured"
        : ticket.kind === "Gross"
          ? "Capture Gross"
          : "Capture Tare";
    const captureHint = ticket.isComplete
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
                        armed={armed}
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
