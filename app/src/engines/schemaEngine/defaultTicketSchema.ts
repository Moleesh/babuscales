import type { Schema } from "./types";

// The Weighing screen's default field set — a real `Schema` row, not
// hardcoded markup, so a site can extend or override it without a release
// Ships as the fallback until a site uploads its own. None of
// these 9 built-in fields carry a `Label` — their display text already
// lives in this app's own i18n strings (strings.ts/ta.ts), keyed by
// FieldId (`ticketFieldIds.ts`'s `resolveFieldLabel`), so there is no
// reason to duplicate that same English/Tamil pair a second time here.
// `Label` stays available on the `Field` type for a genuinely custom field
// an admin adds, which has no existing app string to fall back to.
export const DEFAULT_TICKET_SCHEMA: Schema = {
    SchemaId: "default-ticket",
    Fields: [
        {
            FieldId: "VehicleNo",
            Kind: "Search",
            Master: "Vehicle",
        },
        // The read-only stamp paired right after Vehicle No — no
        // Kind-driven control of its own (TicketFieldsCard.tsx renders it
        // as a fixed, always-read-only input regardless of `Kind`), same
        // "the values, not the button" pattern Gross/Tare/Net/Charge use.
        // Presence here is what decides whether the box shows at all;
        // `Visible: false` still just hides it, same as any other field.
        {
            FieldId: "TicketDate",
            Kind: "Date",
            ReadOnly: true,
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
        // Gross/Tare/Net/Charge carry no real Kind-driven control — those 4
        // boxes are CalcCard.tsx's own hardware-shaped capture/edit UI
        // — the values, not the button. `Calculated: true` is what
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
    // The same per-kind extras the Masters screen used to hardcode
    // (masterFormBody.ts/masterColumns.tsx before this Masters block
    // existed) — Material's Rate (netweight * cost per material,
    // already wired through billing/value.ts's `computeValue`), Party's
    // Email/Phone (read at print time for the e-mail/SMS outbox), and a
    // plain Notes column for every other kind. StoredTare is left out —
    // it has its own system-populated shape (WeightKg/CapturedAt/PartyName,
    // db/storedTare.ts) rather than free-form user columns.
    Masters: [
        {
            Kind: "Party",
            Columns: [
                { FieldId: "Email", Kind: "Text" },
                { FieldId: "Phone", Kind: "Text" },
                { FieldId: "Notes", Kind: "Note" },
            ],
        },
        {
            Kind: "Material",
            Columns: [
                { FieldId: "Rate", Kind: "Money" },
                { FieldId: "Notes", Kind: "Note" },
            ],
        },
        { Kind: "Vehicle", Columns: [{ FieldId: "Notes", Kind: "Note" }] },
        { Kind: "VehicleType", Columns: [{ FieldId: "Notes", Kind: "Note" }] },
        { Kind: "Transporter", Columns: [{ FieldId: "Notes", Kind: "Note" }] },
        { Kind: "Place", Columns: [{ FieldId: "Notes", Kind: "Note" }] },
        { Kind: "Operator", Columns: [{ FieldId: "Notes", Kind: "Note" }] },
    ],
};
