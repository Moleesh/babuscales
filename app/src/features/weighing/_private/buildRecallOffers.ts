import { formatWeightKg } from "@constants/numberFormat";
import { isStoredTareBody, isStoredTareStale, storedTareAgeDays } from "@db/storedTare";
import type { DocRow } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";

import { findLatestTicketForVehicle, findOpenTicketForVehicle } from "../recall";
import type { RecallOffer } from "../RecallBanner";
import { formatTicketNo } from "../ticketNumber";
import type { TicketFormFields, UseWeighingTicket } from "../useWeighingTicket";

const formatStamp = (iso: string | undefined): string =>
    iso ? new Date(iso).toLocaleString() : "—";

export interface BuildRecallOffersArgs {
    ticket: UseWeighingTicket;
    allTicketDocs: DocRow[];
    storedTareCache: UseMasterCache;
    /** Settings' `Rules.StrictTare` — off lets a stored tare be offered at all. */
    strictTare: boolean;
}

// Split out of WeighingScreen (which was creeping past the 300-line budget —
// docs/CodingStandards.md) rather than left inline — this is the one place
// PLAN §9.2's three recall offers (resume an open ticket, reuse a stored
// tare, fill from the vehicle's last ticket) get built, and it doesn't
// touch JSX at all.
export const buildRecallOffers = ({
    ticket,
    allTicketDocs,
    storedTareCache,
    strictTare,
}: BuildRecallOffersArgs): RecallOffer[] => {
    if (ticket.isLocked || !ticket.fields.vehicleNo.trim()) return [];
    const offers: RecallOffer[] = [];

    const openMatch = findOpenTicketForVehicle(
        allTicketDocs.filter((doc) => doc.DocId !== ticket.docId),
        ticket.fields.vehicleNo,
    );
    if (openMatch) {
        offers.push({
            key: "resume",
            label: `Resume ${formatTicketNo(openMatch.doc.DocSeq)}`,
            hint: `${openMatch.kind} ${formatWeightKg(openMatch.weightKg)} kg · ${formatStamp(openMatch.capturedAt)}`,
            onAccept: () => ticket.resume(openMatch.doc),
        });
    }

    if (!strictTare && ticket.captures.every((c) => c.Type !== "Tare")) {
        const storedTare = storedTareCache
            .search(ticket.fields.vehicleNo)
            .find((row) => isStoredTareBody(row.Body) && !isStoredTareStale(row.Body.CapturedAt));
        if (storedTare && isStoredTareBody(storedTare.Body)) {
            const body = storedTare.Body;
            offers.push({
                key: "storedTare",
                label: `Use stored tare ${formatWeightKg(body.WeightKg)} kg`,
                hint: `taken ${storedTareAgeDays(body.CapturedAt)} days ago`,
                onAccept: () => ticket.useStoredTare(body.WeightKg, body.CapturedAt),
            });
        }
    }

    const latest = findLatestTicketForVehicle(
        allTicketDocs,
        ticket.fields.vehicleNo,
        ticket.docId ?? undefined,
    );
    if (latest && (latest.body.Party || latest.body.Material || latest.body.Transporter)) {
        const fill: Partial<Pick<TicketFormFields, "party" | "material" | "transporter">> = {
            party: latest.body.Party,
            material: latest.body.Material,
            transporter: latest.body.Transporter,
        };
        offers.push({
            key: "fill",
            label: `Fill from ${formatTicketNo(latest.doc.DocSeq)}`,
            hint:
                [latest.body.Party, latest.body.Material].filter(Boolean).join(" · ") ||
                "Previous ticket",
            onAccept: () => ticket.applyRecalledFields(fill),
        });
    }

    return offers;
};
