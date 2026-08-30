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
    /** Settings' `Numbering.CurrentEpoch` — task: "do it all the places" —
     * scopes the "resume an open ticket" offer to the active numbering
     * series, same as the open-ticket strip (recall.ts's own comment). */
    currentEpoch: number;
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

// The "resume an open ticket" offer — pulled out of buildRecallOffers purely
// to stay under the file's own line budget.
const buildResumeOffer = (args: BuildRecallOffersArgs): RecallOffer | null => {
    const { ticket, allTicketDocs, currentEpoch, lang, t, weightUnit, dateFmt, timeFmt } = args;
    const openMatch = findOpenTicketForVehicle(
        allTicketDocs.filter((doc) => doc.DocId !== ticket.docId),
        ticket.fields.vehicleNo,
        currentEpoch,
    );
    if (!openMatch) return null;
    return {
        key: "resume",
        label: `${t("weigh.recall.resume")} ${formatTicketNo(openMatch.doc.DocSeq)}`,
        hint: `${t(openMatch.kind === "Tare" ? "tare" : "gross")} ${formatWeightIn(openMatch.weightKg, weightUnit, lang)} · ${formatStamp(openMatch.capturedAt, lang, dateFmt, timeFmt)}`,
        onAccept: () => ticket.resume(openMatch.doc),
    };
};

// The "reuse a stored tare" offer — pulled out of buildRecallOffers purely
// to stay under the file's own line budget.
const buildStoredTareOffer = (args: BuildRecallOffersArgs): RecallOffer | null => {
    const { ticket, storedTareCache, strictTare, t, weightUnit, lang } = args;
    if (strictTare || ticket.captures.some((c) => c.Type === "Tare")) return null;
    const now = Date.now();
    const storedTare = storedTareCache
        .search(ticket.fields.vehicleNo)
        .find((row) => isStoredTareBody(row.Body) && !isStoredTareStale(row.Body.CapturedAt, now));
    if (!storedTare || !isStoredTareBody(storedTare.Body)) return null;
    const body = storedTare.Body;
    return {
        key: "storedTare",
        label: `${t("weigh.recall.useStoredTare")} ${formatWeightIn(body.WeightKg, weightUnit, lang)}`,
        hint: `${t("weigh.recall.takenAgo")} ${storedTareAgeDays(body.CapturedAt, now)} ${t("weigh.recall.daysAgo")}`,
        onAccept: () => ticket.useStoredTare(body.WeightKg, body.CapturedAt),
    };
};

// The "fill from the vehicle's last ticket" offer — pulled out of
// buildRecallOffers purely to stay under the file's own line budget.
const buildFillOffer = (args: BuildRecallOffersArgs): RecallOffer | null => {
    const { ticket, allTicketDocs, t } = args;
    const latest = findLatestTicketForVehicle(allTicketDocs, ticket.fields.vehicleNo, ticket.docId ?? undefined);
    if (!latest || !(latest.body.Party || latest.body.Material || latest.body.Transporter)) return null;
    const fill: Partial<Pick<TicketFormFields, "party" | "material" | "transporter">> = {
        ...(latest.body.Party !== undefined ? { party: latest.body.Party } : {}),
        ...(latest.body.Material !== undefined ? { material: latest.body.Material } : {}),
        ...(latest.body.Transporter !== undefined ? { transporter: latest.body.Transporter } : {}),
    };
    return {
        key: "fill",
        label: `${t("weigh.recall.fillFrom")} ${formatTicketNo(latest.doc.DocSeq)}`,
        hint:
            [latest.body.Party, latest.body.Material].filter(Boolean).join(" · ") ||
            t("weigh.recall.previousTicket"),
        onAccept: () => ticket.applyRecalledFields(fill),
    };
};

// Split out of WeighingScreen (which was creeping past the 300-line budget —
// docs/CodingStandards.md) rather than left inline — this is the one place
// the three recall offers (resume an open ticket, reuse a stored
// tare, fill from the vehicle's last ticket) get built, and it doesn't
// touch JSX at all.
export const buildRecallOffers = (args: BuildRecallOffersArgs): RecallOffer[] => {
    if (args.ticket.isLocked || !args.ticket.fields.vehicleNo.trim()) return [];
    return [buildResumeOffer(args), buildStoredTareOffer(args), buildFillOffer(args)].filter(
        (offer): offer is RecallOffer => offer !== null,
    );
};
