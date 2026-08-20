import { useEffect, useMemo } from "react";

import { getAllFields } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";

import type { UseWeighingTicket } from "../useWeighingTicket";
import { buildTicketFormulaContext } from "./buildTicketFormulaContext";
import type { CalcSegment } from "./calcSegments";
import { computeCalcFieldValues, groupCalcFieldsBySegment } from "./calcSegments";

/**
 * CalcCard's calc-chain rows (any `Calculated` `Formula` field beyond the 4
 * fixed boxes — a Godown schema's NetAfterBags/.../GodownGross/GodownNet)
 * plus the save-side half of the same job: writing each one's result into
 * `ticket.customFields` as it changes, the same bag a plain `Number`/`Text`
 * custom field's own `onChange` already writes into — so `buildTicketBody`
 * (useWeighingTicket.ts) saves them with the ticket exactly like any other
 * custom field, instead of a value the operator saw on screen silently
 * going unsaved (a real gap the old Java app didn't have — it froze its
 * own Godown numbers into `WEIGHING_DATA` at save time). Recomputes
 * whenever an input changes; only actually calls `setCustomField` when the
 * result differs from what's already stored, so this doesn't loop.
 */
export const useComputedCalcFields = (ticket: UseWeighingTicket, ticketSchema: Schema): CalcSegment[] => {
    const ctx = useMemo(
        () => buildTicketFormulaContext(ticket, ticket.customFields),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `ticket` is a fresh object every render; its own fields/weights/customFields are the real deps buildTicketFormulaContext reads.
        [ticket.fields, ticket.weights, ticket.customFields],
    );
    const allFields = useMemo(() => getAllFields(ticketSchema), [ticketSchema]);
    const values = useMemo(() => computeCalcFieldValues(allFields, ctx), [allFields, ctx]);

    useEffect(() => {
        if (ticket.isLocked) return;
        for (const [fieldId, value] of values) {
            if (value === undefined) continue;
            if (ticket.customFields[fieldId] === value) continue;
            ticket.setCustomField(fieldId, value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- same reasoning as above; `ticket.setCustomField`/`ticket.customFields` come off the same `ticket` object already covered by `values`' own deps.
    }, [values, ticket.isLocked]);

    return useMemo(() => groupCalcFieldsBySegment(allFields, values), [allFields, values]);
};
