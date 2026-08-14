import { useMemo } from "react";

import { buildSlipData } from "@engines/print";
import type { SettingsBody } from "@features/settings";

import { formatTicketNo } from "../ticketNumber";
import type { UseWeighingTicket } from "../useWeighingTicket";

export interface UseSlipDataArgs {
    ticket: UseWeighingTicket;
    settings: SettingsBody;
    charge: number | null;
    verifyUrl: string | null;
    /** i18n's active language — decides the locale every timestamp on the slip renders in. */
    lang: string;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the print preview's own data shape, unchanged from the inline useMemo
// it replaces.
export const useSlipData = ({ ticket, settings, charge, verifyUrl, lang }: UseSlipDataArgs) =>
    useMemo(
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
                // "When this ticket's weighing finished" reads better on the
                // slip's own GROSS AT line than "when the first of several
                // loads did" — kept even now that GrossLoads (below) carries
                // every load's own timestamp too.
                grossAt: ticket.captures.filter((c) => c.Type === "Gross").at(-1)?.At ?? null,
                // Task #46's itemised per-load breakdown (PLAN §21) — one
                // entry per Gross capture; every renderer collapses this
                // back to the single GROSS line above when there's only one.
                grossLoads: ticket.captures
                    .filter((c) => c.Type === "Gross")
                    .map((c) => ({ kg: c.WeightKg, at: c.At })),
                operator: settings.OperatorName,
                printCount: ticket.printCount,
                charge,
                amountDp: settings.Formats.AmountDp,
                weightUnit: settings.Formats.WeightUnit,
                dateFmt: settings.Formats.DateFmt,
                timeFmt: settings.Formats.TimeFmt,
                verifyUrl,
                lang,
            }),
        [
            ticket,
            settings.OperatorName,
            settings.Formats.AmountDp,
            settings.Formats.WeightUnit,
            settings.Formats.DateFmt,
            settings.Formats.TimeFmt,
            charge,
            verifyUrl,
            lang,
        ],
    );
