import type { DocRow } from "@db/types";
import type { EmailSource } from "@engines/email/types";
import type { IndicatorReading } from "@engines/indicator";
import type { SlipData } from "@engines/print";
import type { SmsSource } from "@engines/sms/types";
import type { SettingsBody } from "@features/settings";

import type { RecallOffer } from "../RecallBanner";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { computeTicketBilling, type TicketBilling } from "./ticketBilling";
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
    /** i18n's active language — decides the locale the print-preview slip's timestamps render in. */
    lang: string;
    /** Passed through to useRecallOffers so its offer labels/hints localize like the rest of the screen. */
    t: (key: string) => string;
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
    lang,
    t,
}: UseWeighingScreenDerivedArgs): UseWeighingScreenDerived => {
    // `!!ticket.kind` is the right gate — `defaultCaptureKind` (@db/ticketBody)
    // returns null once both Tare and Gross have been captured.
    const armed =
        reading.Stable && reading.WeightKg > 0 && !!ticket.kind && !ticket.isLocked && !licenseGated;
    const recallOffers = useRecallOffers({
        ticket,
        allTicketDocs,
        storedTareCache: caches.storedTare,
        strictTare: settings.Rules.StrictTare,
        lang,
        t,
        weightUnit: settings.Formats.WeightUnit,
        dateFmt: settings.Formats.DateFmt,
        timeFmt: settings.Formats.TimeFmt,
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
        chargeInr: billing.charge,
        onDelivered: bumpRefresh,
    });
    const slipData = useSlipData({ ticket, settings, charge: billing.charge, verifyUrl, lang });

    return { armed, recallOffers, billing, handlePrint, slipData };
};
