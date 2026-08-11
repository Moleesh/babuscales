import { getMaterialRate } from "@db/materialBody";
import type { UseMasterCache } from "@db/useMasterCache";
import { computeCharge, computeValue } from "@engines/billing";

import type { UseWeighingTicket } from "../useWeighingTicket";

export interface TicketBilling {
    charge: number | null;
    materialRate: number | null;
    value: number | null;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — a plain function, not a hook: nothing here calls one, it's just the
// Charge/Rate/Value chain CalcCard and the print slip both need.
export const computeTicketBilling = (
    ticket: UseWeighingTicket,
    materialCache: UseMasterCache,
): TicketBilling => {
    const charge = computeCharge(ticket.weights.netKg !== null);
    const materialRate = getMaterialRate(
        materialCache.rows.find((row) => row.Name === ticket.fields.material)?.Body ?? {},
    );
    const value = computeValue(ticket.weights.netKg, materialRate);
    return { charge, materialRate, value };
};
