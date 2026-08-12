// The 5 fixed ticket fields rendered by their own dedicated rows in
// TicketFieldsCard.tsx — anything else in the active Schema's Fields is a
// custom field, rendered generically by SchemaFieldRow (PLAN §8). Its own
// small file (rather than living inside TicketFieldsCard.tsx, a component
// file) so importing it elsewhere — WeighingScreen's Save-blocking check —
// doesn't trip react-refresh's "only export components" rule.
export const FIXED_FIELD_IDS = ["VehicleNo", "Party", "Material", "Transporter", "ChallanNo"];
