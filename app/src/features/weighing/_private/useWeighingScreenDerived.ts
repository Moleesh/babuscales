import type { DocRow } from "@db/types";
import type { EmailSource } from "@engines/email/types";
import type { IndicatorReading } from "@engines/indicator";
import type { SlipData } from "@engines/print";
import type { SmsSource } from "@engines/sms/types";
import type { SettingsBody } from "@features/settings";

import type { RecallOffer } from "../RecallBanner";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { computeTicketBilling, type TicketBilling } from "./ticketBilling";
import { useAutoCapture } from "./useAutoCapture";
import { useRecallOffers } from "./useRecallOffers";
import { useSlipData } from "./useSlipData";
import { useTicketDelivery } from "./useTicketDelivery";
import { useTicketVerifyUrl } from "./useTicketVerifyUrl";
import type { WeighingCaches } from "./useWeighingScreenTickets";

export interface UseWeighingScreenDerivedArgs {
    ticket: UseWeighingTicket;
    reading: IndicatorReading;
    settings: SettingsBody;
    licenseGated: boolean;
    caches: WeighingCaches;
    allTicketDocs: DocRow[];
    email: EmailSource;
    sms: SmsSource;
    bumpRefresh: () => void;
}

export interface UseWeighingScreenDerived {
    armed: boolean;
    recallOffers: RecallOffer[];
    billing: TicketBilling;
    handlePrint: () => Promise<void>;
    slipData: SlipData;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — every value WeighingScreen's own JSX needs that isn't already owned by
// useWeighingScreenTickets, wired together in one place so WeighingScreen's
// body reads as "tickets, then derived, then render" instead of six
// separate hook calls each with their own deps line.
export const useWeighingScreenDerived = ({
    ticket,
    reading,
    settings,
    licenseGated,
    caches,
    allTicketDocs,
    email,
    sms,
    bumpRefresh,
}: UseWeighingScreenDerivedArgs): UseWeighingScreenDerived => {
    const armed = useAutoCapture({ reading, ticket, settings, licenseGated });
    const recallOffers = useRecallOffers({
        ticket,
        allTicketDocs,
        storedTareCache: caches.storedTare,
        strictTare: settings.Rules.StrictTare,
    });
    const billing = computeTicketBilling(ticket, caches.material);
    const verifyUrl = useTicketVerifyUrl(settings, ticket);
    const { handlePrint } = useTicketDelivery({
        ticket,
        email,
        sms,
        settings,
        partyCache: caches.party,
        verifyUrl,
        onDelivered: bumpRefresh,
    });
    const slipData = useSlipData({ ticket, settings, charge: billing.charge, verifyUrl });

    return { armed, recallOffers, billing, handlePrint, slipData };
};
