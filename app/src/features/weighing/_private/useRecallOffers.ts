import { useMemo } from "react";

import type { WeightUnit } from "@constants/numberFormat";
import type { DocRow } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";

import type { RecallOffer } from "../RecallBanner";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { buildRecallOffers } from "./buildRecallOffers";

export interface UseRecallOffersArgs {
    ticket: UseWeighingTicket;
    allTicketDocs: DocRow[];
    storedTareCache: UseMasterCache;
    strictTare: boolean;
    lang: string;
    t: (key: string) => string;
    weightUnit: WeightUnit;
    dateFmt: string;
    timeFmt: "24" | "12";
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — memoizes buildRecallOffers over the same deps the inline useMemo it
// replaces used.
export const useRecallOffers = ({
    ticket,
    allTicketDocs,
    storedTareCache,
    strictTare,
    lang,
    t,
    weightUnit,
    dateFmt,
    timeFmt,
}: UseRecallOffersArgs): RecallOffer[] =>
    useMemo(
        () =>
            buildRecallOffers({
                ticket,
                allTicketDocs,
                storedTareCache,
                strictTare,
                lang,
                t,
                weightUnit,
                dateFmt,
                timeFmt,
            }),
        [ticket, allTicketDocs, storedTareCache, strictTare, lang, t, weightUnit, dateFmt, timeFmt],
    );
