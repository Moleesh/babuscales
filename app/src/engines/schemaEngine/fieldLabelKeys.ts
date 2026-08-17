// Every built-in FieldId's i18n key (`strings.ts`/`ta.ts`) — the 9 fields
// `defaultTicketSchema.ts` ships carry no `Label` on their schema entry at
// all; their display text always comes from here instead, so it's
// translated the same way as the rest of the app's own chrome rather than
// duplicated per-field in the schema JSON. Lives in the engine (not
// Weighing's own `_private`) so both Weighing's rendering and Settings'
// admin field-schema table can share it without reaching into each other's
// private folders.
export const FIELD_LABEL_KEYS: Partial<Record<string, string>> = {
    VehicleNo: "weigh.vehicleNo",
    TicketDate: "weigh.ticketDate",
    Party: "weigh.party",
    Material: "weigh.material",
    Transporter: "weigh.transporter",
    ChallanNo: "weigh.challanNo",
    Gross: "weigh.gross",
    Tare: "weigh.tare",
    Net: "weigh.net",
    Charge: "weigh.charge",
};
