import { getMaterialRate } from "@db/materialBody";
import { isDecimalLiteral } from "@db/ticketBody";
import type { UseMasterCache } from "@db/useMasterCache";
import { computeValue } from "@engines/billing";

import type { UseWeighingTicket } from "../useWeighingTicket";

export interface TicketBilling {
    /** Whatever the operator has typed into the Charge field, as a decimal string — no auto-calc. `null` for "not entered yet"/not a plain decimal literal, same rule `chargeToStore` (useWeighingTicket.ts) uses when saving it. Never a JS number — see `@engines/formulaEngine/Decimal`'s own "never round-trip through `toNumber`" rule. */
    charge: string | null;
    materialRate: string | null;
    value: number | null;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — a plain function, not a hook: nothing here calls one, it's just the
// Charge/Rate/Value chain CalcCard and the print slip both need.
export const computeTicketBilling = (
    ticket: UseWeighingTicket,
    materialCache: UseMasterCache,
): TicketBilling => {
    const rawCharge = ticket.fields.charge.trim();
    const charge = rawCharge && isDecimalLiteral(rawCharge) ? rawCharge : null;
    const materialRate = getMaterialRate(
        materialCache.rows.find((row) => row.Name === ticket.fields.material)?.Body ?? {},
    );
    const value = computeValue(ticket.weights.netKg, materialRate);
    return { charge, materialRate, value };
};
