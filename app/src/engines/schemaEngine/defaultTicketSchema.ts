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
        // (task: "the values not the button") — these entries exist purely
        // to give each box a schema-sourced Label like every other field,
        // per "no hard coding ... including gross and net". TicketFieldsCard
        // skips them entirely (CAPTURE_FIELD_IDS) rather than rendering a
        // second, generic row for them.
        {
            FieldId: "Gross",
            Kind: "Weight",
            Label: { en: "Gross", ta: "மொத்த எடை" },
        },
        {
            FieldId: "Tare",
            Kind: "Weight",
            Label: { en: "Tare", ta: "தார எடை" },
        },
        {
            FieldId: "Net",
            Kind: "Formula",
            Formula: "Abs(Gross - Tare)",
            Label: { en: "Net", ta: "நிகர எடை" },
        },
        {
            FieldId: "Charge",
            Kind: "Money",
            Label: { en: "Charge", ta: "கட்டணம்" },
        },
    ],
};
