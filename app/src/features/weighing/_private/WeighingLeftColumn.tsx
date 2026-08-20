import type { WeightUnit } from "@constants/numberFormat";
import type { Schema } from "@engines/schemaEngine";

import type { RecallOffer } from "../RecallBanner";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { CalcCard } from "./CalcCard";
import type { CalcSegment } from "./calcSegments";
import type { TicketBilling } from "./ticketBilling";
import { TicketFieldsCard } from "./TicketFieldsCard";
import type { WeighingCaches } from "./useWeighingScreenTickets";

export interface WeighingLeftColumnProps {
    ticket: UseWeighingTicket;
    ticketDate: string;
    recallOffers: RecallOffer[];
    caches: WeighingCaches;
    billing: TicketBilling;
    /** The active Schema — threaded to CalcCard so its Gross/Tare/Net/Charge box labels can be schema-sourced. */
    ticketSchema: Schema;
    amountDp: 0 | 2;
    /** Settings → Weighing → Rules.ManualEntry — threaded to CalcCard's Tare/Gross boxes. */
    manualEntry: boolean;
    /** Settings' `Formats.WeightUnit` — threaded to CalcCard's boxes/formula/status pill. */
    weightUnit: WeightUnit;
    /** Settings' `Formats.DateFmt`/`TimeFmt` — threaded to CalcCard's Tare/Gross capture stamps. */
    dateFmt: string;
    timeFmt: "24" | "12";
    /** `useComputedCalcFields` (WeighingScreen.tsx) — threaded straight to CalcCard's own calc-chain rows. */
    calcSegments: CalcSegment[];
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the left `.col`: Ticket fields, then the running Calc card. Purely
// layout — everything it renders comes straight from props.
export const WeighingLeftColumn = ({
    ticket,
    ticketDate,
    recallOffers,
    caches,
    billing,
    ticketSchema,
    amountDp,
    manualEntry,
    weightUnit,
    dateFmt,
    timeFmt,
    calcSegments,
}: WeighingLeftColumnProps) => (
    <>
        <TicketFieldsCard
            ticket={ticket}
            ticketDate={ticketDate}
            recallOffers={recallOffers}
            vehicleCache={caches.vehicle}
            partyCache={caches.party}
            materialCache={caches.material}
            transporterCache={caches.transporter}
        />
        <CalcCard
            ticketSchema={ticketSchema}
            weights={ticket.weights}
            captures={ticket.captures}
            chargeValue={ticket.fields.charge}
            onChargeChange={(value) => ticket.setField("charge", value)}
            materialRate={billing.materialRate}
            value={billing.value}
            amountDp={amountDp}
            manualEntry={manualEntry}
            kind={ticket.kind}
            isLocked={ticket.isLocked}
            onManualCapture={ticket.manualCapture}
            weightUnit={weightUnit}
            dateFmt={dateFmt}
            timeFmt={timeFmt}
            calcSegments={calcSegments}
        />
    </>
);
