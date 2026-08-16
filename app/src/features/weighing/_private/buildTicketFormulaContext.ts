import type { DerivedWeights } from "@db/ticketBody";
import type { FormulaContext, FormulaValue } from "@engines/formulaEngine";
import { fromInt } from "@engines/formulaEngine/Decimal";

import type { CustomFieldValue, TicketFormFields } from "../useWeighingTicket";

// A ticket's own field values, exposed as a `FormulaContext` — the shared
// resolver every `Validate` gate and every `Formula`-kind field's own
// display evaluate against. Pure: no React, no hooks, so it's
// just as easy to unit-test as `evaluateGate` itself.
export const buildTicketFormulaContext = (
    ticket: {
        weights: DerivedWeights;
        fields: TicketFormFields;
    },
    customValues: Record<string, CustomFieldValue>,
): FormulaContext => ({
    getVariable: (name: string): FormulaValue => {
        // Gross/Tare/Net as Decimal (kg) — a ticket with an unresolved
        // weight can't sensibly gate a Validate formula on it, so treat it
        // as 0 rather than throwing; a formula must never crash the form
        // just because a weight hasn't been captured yet.
        if (name === "Gross") return fromInt(ticket.weights.grossKg ?? 0);
        if (name === "Tare") return fromInt(ticket.weights.tareKg ?? 0);
        if (name === "Net") return fromInt(ticket.weights.netKg ?? 0);
        if (name === "VehicleNo") return ticket.fields.vehicleNo;
        if (name === "Party") return ticket.fields.party;
        if (name === "Material") return ticket.fields.material;
        if (name === "Transporter") return ticket.fields.transporter;
        if (name === "ChallanNo") return ticket.fields.challanNo;

        // Any other bare identifier resolves against this ticket's own
        // CustomFields bag — lets one custom field's Validate formula
        // reference another custom field by FieldId.
        const custom = customValues[name];
        if (custom === undefined || custom === null) return "";
        return typeof custom === "number" ? fromInt(custom) : custom;
    },
    // No callFunction — Rate(Material)/VehicleCharge(...)-style site
    // functions need a real lookup table that doesn't exist yet (that's
    // the separate, larger "wire formula engine to live billing" task). A
    // formula field or gate that calls an unknown function throws a clear
    // "unknown function" error from evaluateExpr itself — acceptable for
    // this MVP, do not add fake function implementations here.
});
