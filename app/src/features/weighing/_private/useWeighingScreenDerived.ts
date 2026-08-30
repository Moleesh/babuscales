import { useMemo } from "react";

import type { DocRow } from "@db/types";
import type { EmailSource } from "@engines/email/types";
import type { IndicatorReading } from "@engines/indicator";
import type { SlipData } from "@engines/print";
import type { SmsSource } from "@engines/sms/types";
import type { SettingsBody } from "@features/settings";

import { chargeToNumber } from "@engines/billing";

import type { RecallOffer } from "../RecallBanner";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { buildRecallOffers } from "./buildRecallOffers";
import { computeTicketBilling, type TicketBilling } from "./ticketBilling";
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
    /** Passed through to buildRecallOffers so its offer labels/hints localize like the rest of the screen. */
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
    // Inlined from the former useRecallOffers.ts (task: it was a pure
    // useMemo-wrapped pass-through around buildRecallOffers with no added
    // logic beyond that memoization, and this was its only caller).
    const recallOffers = useMemo(
        () =>
            buildRecallOffers({
                ticket,
                allTicketDocs,
                storedTareCache: caches.storedTare,
                strictTare: settings.Rules.StrictTare,
                currentEpoch: settings.Numbering.CurrentEpoch,
                lang,
                t,
                weightUnit: settings.Formats.WeightUnit,
                dateFmt: settings.Formats.DateFmt,
                timeFmt: settings.Formats.TimeFmt,
            }),
        [
            ticket,
            allTicketDocs,
            caches.storedTare,
            settings.Rules.StrictTare,
            settings.Numbering.CurrentEpoch,
            lang,
            t,
            settings.Formats.WeightUnit,
            settings.Formats.DateFmt,
            settings.Formats.TimeFmt,
        ],
    );
    const billing = computeTicketBilling(ticket, caches.material);
    // `billing.charge` is a decimal string (or null for "not entered") —
    // useTicketDelivery's webhook/Tally payload and useSlipData's print
    // formatting both still work in plain numbers, so convert at this one
    // boundary rather than threading strings further down. `null` is
    // preserved (not coerced to 0/chargeToNumber's null-safe default) since
    // both downstream consumers treat null as "no charge" distinctly from 0.
    const chargeNumber = billing.charge === null ? null : chargeToNumber(billing.charge);
    const verifyUrl = useTicketVerifyUrl(settings, ticket);
    const { handlePrint } = useTicketDelivery({
        ticket,
        email,
        sms,
        settings,
        partyCache: caches.party,
        verifyUrl,
        chargeInr: chargeNumber,
        onDelivered: bumpRefresh,
    });
    const slipData = useSlipData({ ticket, settings, charge: chargeNumber, verifyUrl, lang });

    return { armed, recallOffers, billing, handlePrint, slipData };
};
