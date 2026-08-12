import type { RecallOffer } from "../RecallBanner";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { CalcCard } from "./CalcCard";
import type { TicketBilling } from "./ticketBilling";
import { TicketFieldsCard } from "./TicketFieldsCard";
import type { WeighingCaches } from "./useWeighingScreenTickets";

export interface WeighingLeftColumnProps {
    ticket: UseWeighingTicket;
    ticketDate: string;
    recallOffers: RecallOffer[];
    caches: WeighingCaches;
    billing: TicketBilling;
    amountDp: 0 | 2;
    /** Settings → Weighing → Rules.ManualEntry — threaded to CalcCard's Tare/Gross boxes. */
    manualEntry: boolean;
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
    amountDp,
    manualEntry,
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
            weights={ticket.weights}
            captures={ticket.captures}
            charge={billing.charge}
            materialRate={billing.materialRate}
            value={billing.value}
            amountDp={amountDp}
            manualEntry={manualEntry}
            kind={ticket.kind}
            isLocked={ticket.isLocked}
            onManualCapture={ticket.manualCapture}
        />
    </>
);
