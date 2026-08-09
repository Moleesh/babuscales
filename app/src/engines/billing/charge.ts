// Ported from the mock's `RATE = { tareCharge:100, grossCharge:150 }`. The
// schema's own `Charge` field (src/engines/schemaEngine) carries the
// aspirational formula string `"Type.TareCharge + Type.GrossCharge"` —
// but the mock's *actual* runtime charge (`P()`'s `c.charge`) never reads
// a per-VehicleType rate at all; it's this one flat pair, added together,
// for every ticket with both weights in. That's what's ported here — a
// real per-vehicle-type rate table is a bigger feature (VehicleType master
// rows currently carry no custom fields at all — app/README.md known gap)
// than "the charge on a printed ticket is a real number instead of a
// fabricated demo one", which is what this closes.
//
// Hardcoded rather than Settings-driven for now: a real installation would
// want this admin-editable, tracked as a follow-up in app/README.md.
export const TARE_CHARGE_INR = 100;
export const GROSS_CHARGE_INR = 150;

/** `null` until both weights are in — same "nothing to total yet" rule `summarizeTicketRows` already applies to net tonnage. */
export const computeCharge = (isComplete: boolean): number | null =>
    isComplete ? TARE_CHARGE_INR + GROSS_CHARGE_INR : null;
