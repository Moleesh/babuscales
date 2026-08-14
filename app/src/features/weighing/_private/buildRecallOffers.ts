import { formatDateTimeInFmt, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import { isStoredTareBody, isStoredTareStale, storedTareAgeDays } from "@db/storedTare";
import type { DocRow } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";

import { findLatestTicketForVehicle, findOpenTicketForVehicle } from "../recall";
import type { RecallOffer } from "../RecallBanner";
import { formatTicketNo } from "../ticketNumber";
import type { TicketFormFields, UseWeighingTicket } from "../useWeighingTicket";

const formatStamp = (
    iso: string | undefined,
    lang: string,
    dateFmt: string,
    timeFmt: "24" | "12",
): string => (iso ? formatDateTimeInFmt(iso, lang, dateFmt, timeFmt) : "—");

export interface BuildRecallOffersArgs {
    ticket: UseWeighingTicket;
    allTicketDocs: DocRow[];
    storedTareCache: UseMasterCache;
    /** Settings' `Rules.StrictTare` — off lets a stored tare be offered at all. */
    strictTare: boolean;
    /** i18n's active language — decides the locale the "resume" offer's timestamp renders in. */
    lang: string;
    /** Task: these three offers were hardcoded English, unlike the rest of the screen — resolves the labels/hints against the active language pack. */
    t: (key: string) => string;
    /** Settings' `Formats.WeightUnit` — the resume/stored-tare hints display in it. */
    weightUnit: WeightUnit;
    /** Settings' `Formats.DateFmt`/`TimeFmt` — the "resume" offer's timestamp displays in these. */
    dateFmt: string;
    timeFmt: "24" | "12";
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
    lang,
    t,
    weightUnit,
    dateFmt,
    timeFmt,
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
            label: `${t("weigh.recall.resume")} ${formatTicketNo(openMatch.doc.DocSeq)}`,
            hint: `${t(openMatch.kind === "Tare" ? "tare" : "gross")} ${formatWeightIn(openMatch.weightKg, weightUnit)} · ${formatStamp(openMatch.capturedAt, lang, dateFmt, timeFmt)}`,
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
                label: `${t("weigh.recall.useStoredTare")} ${formatWeightIn(body.WeightKg, weightUnit)}`,
                hint: `${t("weigh.recall.takenAgo")} ${storedTareAgeDays(body.CapturedAt)} ${t("weigh.recall.daysAgo")}`,
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
            label: `${t("weigh.recall.fillFrom")} ${formatTicketNo(latest.doc.DocSeq)}`,
            hint:
                [latest.body.Party, latest.body.Material].filter(Boolean).join(" · ") ||
                t("weigh.recall.previousTicket"),
            onAccept: () => ticket.applyRecalledFields(fill),
        });
    }

    return offers;
};
