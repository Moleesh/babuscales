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
            FieldId: "Net",
            Kind: "Formula",
            Formula: "Abs(Gross - Tare)",
            Label: { en: "Net", ta: "நிகர எடை" },
        },
    ],
};
