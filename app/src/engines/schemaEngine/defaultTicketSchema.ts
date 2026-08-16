import type { Schema } from "./types";

// The Weighing screen's default field set — a real `Schema` row, not
// hardcoded markup, so a site can extend or override it without a release
// (PLAN §8). Ships as the fallback until a site uploads its own. None of
// these 9 built-in fields carry a `Label` — their display text already
// lives in this app's own i18n strings (strings.ts/ta.ts), keyed by
// FieldId (`ticketFieldIds.ts`'s `resolveFieldLabel`), so there is no
// reason to duplicate that same English/Tamil pair a second time here.
// `Label` stays available on the `Field` type for a genuinely custom field
// an admin adds, which has no existing app string to fall back to.
export const DEFAULT_TICKET_SCHEMA: Schema = {
    SchemaId: "default-ticket",
    DocKind: "Ticket",
    Fields: [
        {
            FieldId: "VehicleNo",
            Kind: "Search",
            Master: "Vehicle",
        },
        {
            FieldId: "Party",
            Kind: "Search",
            Master: "Party",
        },
        {
            FieldId: "Material",
            Kind: "Search",
            Master: "Material",
        },
        {
            FieldId: "Transporter",
            Kind: "Search",
            Master: "Transporter",
        },
        {
            FieldId: "ChallanNo",
            Kind: "Text",
        },
        // Gross/Tare/Net/Charge carry no real Kind-driven control — those 4
        // boxes are CalcCard.tsx's own hardware-shaped capture/edit UI
        // (task: "the values not the button"). `Calculated: true` is what
        // routes a field here instead of the generic Ticket field loop
        // (TicketFieldsCard skips every Calculated field); `Captured`
        // marks the two that mirror a physical capture rather than a
        // derived value.
        {
            FieldId: "Gross",
            Kind: "Number",
            Captured: "Gross",
            Calculated: true,
        },
        {
            FieldId: "Tare",
            Kind: "Number",
            Captured: "Tare",
            Calculated: true,
        },
        {
            FieldId: "Net",
            Kind: "Formula",
            Formula: "Abs(Gross - Tare)",
            Calculated: true,
        },
        {
            FieldId: "Charge",
            Kind: "Money",
            Calculated: true,
        },
    ],
};
