import type { WeightUnit } from "@constants/numberFormat";
import { resolveSegmentKind } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import type { RecallOffer } from "../RecallBanner";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { CalcCard } from "./CalcCard";
import type { CalcFieldResults } from "./calcSegments";
import { TicketFieldsCard } from "./TicketFieldsCard";
import type { WeighingCaches } from "./useWeighingScreenTickets";

export interface WeighingLeftColumnProps {
    ticket: UseWeighingTicket;
    ticketDate: string;
    recallOffers: RecallOffer[];
    caches: WeighingCaches;
    /** The active Schema — one card renders per `Segments` entry, in order (task: Godown's 2 enterable "top" cards + 2 calculated "bottom" cards). */
    ticketSchema: Schema;
    /** Settings → Weighing → Rules.ManualEntry — threaded to every "Calculated" segment's Tare/Gross boxes. */
    manualEntry: boolean;
    /** Settings → Weighing → Rules.ShowFormulaBreakdown — threaded to every "Calculated" segment's formula line. */
    showFormulaBreakdown: boolean;
    /** Settings' `Formats.WeightUnit` — threaded to every "Calculated" segment's boxes/formula/status pill. */
    weightUnit: WeightUnit;
    /** Settings' `Formats.DateFmt`/`TimeFmt` — threaded to every "Calculated" segment's Tare/Gross capture stamps. */
    dateFmt: string;
    timeFmt: "24" | "12";
    /** `useComputedCalcFields` (WeighingScreen.tsx) — the whole schema's values/breakdowns; each "Calculated" segment's card picks its own slice out. */
    calcValues: CalcFieldResults;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the left `.col`: one card per `ticketSchema.Segments` entry, in schema
// order. `"Enterable"` segments render as a TicketFieldsCard (the first one
// carries the ticket-number chip and recall banner — see TicketFieldsCard's
// own `primary` prop); `"Calculated"` segments render as a CalcCard, each of
// which now shows its own calculated fields' formulas per-box rather than
// one summary line on a single designated card. Purely layout — everything
// it renders comes straight from props.
export const WeighingLeftColumn = ({
    ticket,
    ticketDate,
    recallOffers,
    caches,
    ticketSchema,
    manualEntry,
    showFormulaBreakdown,
    weightUnit,
    dateFmt,
    timeFmt,
    calcValues,
}: WeighingLeftColumnProps) => {
    const { lang } = useTranslation();
    const segments = ticketSchema.Segments;
    const firstEnterableIndex = segments.findIndex((seg) => resolveSegmentKind(seg) === "Enterable");

    return (
        <>
            {segments.map((segment, index) => {
                const title = segment.Label ? resolveLocalized(segment.Label, lang) : segment.Segment;
                const kind = resolveSegmentKind(segment);
                if (kind === "Enterable") {
                    return (
                        <TicketFieldsCard
                            key={segment.Segment}
                            ticket={ticket}
                            ticketDate={ticketDate}
                            title={title}
                            fields={segment.Fields}
                            primary={index === firstEnterableIndex}
                            recallOffers={recallOffers}
                            vehicleCache={caches.vehicle}
                            partyCache={caches.party}
                            materialCache={caches.material}
                            transporterCache={caches.transporter}
                        />
                    );
                }
                return (
                    <CalcCard
                        key={segment.Segment}
                        title={title}
                        fields={segment.Fields}
                        weights={ticket.weights}
                        captures={ticket.captures}
                        chargeValue={ticket.fields.charge}
                        onChargeChange={(value) => ticket.setField("charge", value)}
                        manualEntry={manualEntry}
                        showFormulaBreakdown={showFormulaBreakdown}
                        kind={ticket.kind}
                        isLocked={ticket.isLocked}
                        onManualCapture={ticket.manualCapture}
                        weightUnit={weightUnit}
                        dateFmt={dateFmt}
                        timeFmt={timeFmt}
                        calcValues={calcValues}
                    />
                );
            })}
        </>
    );
};
