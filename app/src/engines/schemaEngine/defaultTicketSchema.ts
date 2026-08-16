import type { Schema } from "./types";

// The Weighing screen's default field set — a real `Schema` row, not
// hardcoded markup, so a site can extend or override it without a release
// (PLAN §8). Ships as the fallback until a site uploads its own.
export const DEFAULT_TICKET_SCHEMA: Schema = {
    SchemaId: "default-ticket",
    DocKind: "Ticket",
    Fields: [
        {
            FieldId: "VehicleNo",
            Kind: "Search",
            Master: "Vehicle",
            Label: { en: "Vehicle No", ta: "வாகன எண்" },
        },
        {
            FieldId: "Party",
            Kind: "Search",
            Master: "Party",
            Label: { en: "Party", ta: "வாடிக்கையாளர்" },
        },
        {
            FieldId: "Material",
            Kind: "Search",
            Master: "Material",
            Label: { en: "Material", ta: "பொருள்" },
        },
        {
            FieldId: "Transporter",
            Kind: "Search",
            Master: "Transporter",
            Label: { en: "Transporter", ta: "போக்குவரத்து" },
        },
        {
            FieldId: "ChallanNo",
            Kind: "Text",
            Label: { en: "Challan No", ta: "சலான் எண்" },
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
            Label: { en: "Gross", ta: "மொத்த எடை" },
        },
        {
            FieldId: "Tare",
            Kind: "Number",
            Captured: "Tare",
            Calculated: true,
            Label: { en: "Tare", ta: "தார எடை" },
        },
        {
            FieldId: "Net",
            Kind: "Formula",
            Formula: "Abs(Gross - Tare)",
            Calculated: true,
            Label: { en: "Net", ta: "நிகர எடை" },
        },
        {
            FieldId: "Charge",
            Kind: "Money",
            Calculated: true,
            Label: { en: "Charge", ta: "கட்டணம்" },
        },
    ],
};
