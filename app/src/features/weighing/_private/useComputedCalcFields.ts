import { useEffect, useMemo } from "react";

import { getAllFields, getCalculatedFieldIds } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";

import type { UseWeighingTicket } from "../useWeighingTicket";
import { buildTicketFormulaContext } from "./buildTicketFormulaContext";
import type { CalcFieldResults } from "./calcSegments";
import { computeCalcFieldValues } from "./calcSegments";

/**
 * Every `Calculated` `Formula` field beyond the 4 fixed boxes (a Godown
 * schema's NetAfterBags/.../GodownGross/GodownNet, however many
 * `"Calculated"` segments they're now split across — see calcSegments.ts)
 * plus the save-side half of the same job: writing each one's result into
 * `ticket.customFields` as it changes, the same bag a plain `Number`/`Text`
 * custom field's own `onChange` already writes into — so `buildTicketBody`
 * (useWeighingTicket.ts) saves them with the ticket exactly like any other
 * custom field, instead of a value the operator saw on screen silently
 * going unsaved (a real gap the old Java app didn't have — it froze its
 * own Godown numbers into `WEIGHING_DATA` at save time). Recomputes
 * whenever an input changes; only actually calls `setCustomField` when the
 * result differs from what's already stored, so this doesn't loop.
 *
 * Returns the flat `FieldId → value` map rather than pre-grouped rows —
 * WeighingLeftColumn.tsx now renders one CalcCard per `"Calculated"`
 * segment, so each card picks its own slice out via
 * `calcSegments.ts`'s `getCalcItemsForFields`.
 */
export const useComputedCalcFields = (ticket: UseWeighingTicket, ticketSchema: Schema): CalcFieldResults => {
    const ctx = useMemo(
        () => buildTicketFormulaContext(ticket, ticket.customFields),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `ticket` is a fresh object every render; its own fields/weights/customFields are the real deps buildTicketFormulaContext reads.
        [ticket.fields, ticket.weights, ticket.customFields],
    );
    const allFields = useMemo(() => getAllFields(ticketSchema), [ticketSchema]);
    const calculatedIds = useMemo(() => getCalculatedFieldIds(ticketSchema), [ticketSchema]);
    const results = useMemo(
        () => computeCalcFieldValues(allFields, ctx, calculatedIds),
        [allFields, ctx, calculatedIds],
    );

    useEffect(() => {
        if (ticket.isLocked) return;
        for (const [fieldId, value] of results.values) {
            if (value === undefined) {
                // The formula stopped evaluating (e.g. an upstream field was
                // cleared) — drop the stale prior result instead of leaving
                // it sitting in customFields to be saved/printed as if it
                // were still current.
                if (ticket.customFields[fieldId] !== undefined) {
                    ticket.setCustomField(fieldId, undefined);
                }
                continue;
            }
            if (ticket.customFields[fieldId] === value) continue;
            ticket.setCustomField(fieldId, value);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- same reasoning as above; `ticket.setCustomField`/`ticket.customFields` come off the same `ticket` object already covered by `results`' own deps.
    }, [results, ticket.isLocked]);

    return results;
};
