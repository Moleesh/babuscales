import { useMemo } from "react";

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
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — memoizes buildRecallOffers over the same deps the inline useMemo it
// replaces used.
export const useRecallOffers = ({
    ticket,
    allTicketDocs,
    storedTareCache,
    strictTare,
}: UseRecallOffersArgs): RecallOffer[] =>
    useMemo(
        () => buildRecallOffers({ ticket, allTicketDocs, storedTareCache, strictTare }),
        [ticket, allTicketDocs, storedTareCache, strictTare],
    );
