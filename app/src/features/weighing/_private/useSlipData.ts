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
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the print preview's own data shape, unchanged from the inline useMemo
// it replaces.
export const useSlipData = ({ ticket, settings, charge, verifyUrl }: UseSlipDataArgs) =>
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
                // Task #46 — the slip's own layout has one Gross line (no
                // itemised per-load breakdown, app/README.md known gap), so a
                // multi-gross ticket shows its LAST Gross's timestamp here —
                // "when this ticket's weighing finished" reads better on a
                // printed slip than "when the first of several loads did."
                grossAt: ticket.captures.filter((c) => c.Type === "Gross").at(-1)?.At ?? null,
                operator: settings.OperatorName,
                printCount: ticket.printCount,
                charge,
                amountDp: settings.Formats.AmountDp,
                verifyUrl,
            }),
        [ticket, settings.OperatorName, settings.Formats.AmountDp, charge, verifyUrl],
    );
