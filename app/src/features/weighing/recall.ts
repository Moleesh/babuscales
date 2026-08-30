import { deriveWeights, isOpenTicket, parseTicketBody } from "@db/ticketBody";
import type { TicketBody } from "@db/ticketBody";
import type { DocRow } from "@db/types";

// Collapses internal whitespace too (not just leading/trailing) — an
// operator retyping "MH 12 AB 1234" as "MH 12  AB 1234" (or with a tab) is
// still the same vehicle number and should still match.
const normalizeVehicleNo = (v: string): string => v.trim().toLowerCase().replace(/\s+/g, " ");

const sameVehicle = (a: string, b: string): boolean => normalizeVehicleNo(a) === normalizeVehicleNo(b);

// Shared by listOpenTickets and findLatestTicketForVehicle below — both want
// the same "most recently touched first" ordering, previously two identical
// inline comparators.
const byMostRecentlyUpdated = (a: { doc: DocRow }, b: { doc: DocRow }): number =>
    b.doc.UpdatedAt.localeCompare(a.doc.UpdatedAt);

export interface OpenTicketSummary {
    doc: DocRow;
    body: TicketBody;
    /** The one weight already in, and which side it is. */
    weightKg: number;
    kind: "Tare" | "Gross";
    capturedAt: string;
}

/** The open-ticket strip: every ticket parked with exactly one weight, in
 * the active numbering series. A ticket from before a prior "Reset the
 * counter now" doesn't show up here, so it can't be mistakenly resumed
 * against the current shift's numbering. `currentEpoch` is optional,
 * defaulting to "every series", only so `findLatestTicketForVehicle`
 * below (fill-from-history, a deliberately unscoped lookup) doesn't need
 * its own copy of this filter. */
export const listOpenTickets = (docs: DocRow[], currentEpoch?: number): OpenTicketSummary[] =>
    docs
        .filter((doc) => !doc.IsCancelled)
        .filter((doc) => currentEpoch === undefined || doc.SeriesEpoch === currentEpoch)
        .map((doc) => ({ doc, body: parseTicketBody(doc.Body) }))
        .filter(({ doc, body }) => isOpenTicket(doc.IsCancelled, body.Captures))
        .flatMap(({ doc, body }) => {
            // `isOpenTicket` guarantees at least one capture exists here, and
            // `parseTicketBody`'s zod schema guarantees a valid WeightKg on
            // any capture that survived parsing. If that invariant is ever
            // violated (corrupt row, future schema drift), don't paper over
            // it with a fake 0kg — drop the ticket from the strip so a
            // broken row can't be mistaken for a real open ticket.
            const capture = body.Captures[0];
            if (!capture || !Number.isFinite(capture.WeightKg)) {
                console.warn(`recall: open ticket ${doc.DocId} has no usable capture weight; skipping`);
                return [];
            }
            return [
                {
                    doc,
                    body,
                    weightKg: capture.WeightKg,
                    kind: capture.Type,
                    capturedAt: capture.At ?? doc.UpdatedAt,
                },
            ];
        })
        .sort(byMostRecentlyUpdated);

/** "That vehicle has a ticket awaiting its second weight." Current-series
 * scoped — same reasoning as `listOpenTickets` above. */
export const findOpenTicketForVehicle = (
    docs: DocRow[],
    vehicleNo: string,
    currentEpoch?: number,
): OpenTicketSummary | undefined =>
    vehicleNo.trim()
        ? listOpenTickets(docs, currentEpoch).find((t) => sameVehicle(t.body.VehicleNo ?? "", vehicleNo))
        : undefined;

export interface PreviousTicketSummary {
    doc: DocRow;
    body: TicketBody;
}

/** "Fill from TKTxxxx — any previous ticket for that vehicle." Excludes the ticket currently open on screen. */
export const findLatestTicketForVehicle = (
    docs: DocRow[],
    vehicleNo: string,
    excludeDocId?: string,
): PreviousTicketSummary | undefined => {
    if (!vehicleNo.trim()) return undefined;
    const candidates = docs
        .filter((doc) => doc.DocId !== excludeDocId)
        .map((doc) => ({ doc, body: parseTicketBody(doc.Body) }))
        .filter(({ body }) => sameVehicle(body.VehicleNo ?? "", vehicleNo))
        .filter(({ body }) => deriveWeights(body.Captures).netKg !== null)
        .sort(byMostRecentlyUpdated);
    return candidates[0];
};
