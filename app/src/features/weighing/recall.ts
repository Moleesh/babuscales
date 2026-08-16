import { deriveWeights, isOpenTicket, parseTicketBody } from "@db/ticketBody";
import type { TicketBody } from "@db/ticketBody";
import type { DocRow } from "@db/types";

const sameVehicle = (a: string, b: string): boolean =>
    a.trim().toLowerCase() === b.trim().toLowerCase();

export interface OpenTicketSummary {
    doc: DocRow;
    body: TicketBody;
    /** The one weight already in, and which side it is. */
    weightKg: number;
    kind: "Tare" | "Gross";
    capturedAt: string;
}

/** The open-ticket strip: every ticket parked with exactly one weight. */
export const listOpenTickets = (docs: DocRow[]): OpenTicketSummary[] =>
    docs
        .filter((doc) => !doc.IsCancelled)
        .map((doc) => ({ doc, body: parseTicketBody(doc.Body) }))
        .filter(({ doc, body }) => isOpenTicket(doc.IsCancelled, body.Captures))
        .map(({ doc, body }) => {
            const capture = body.Captures[0];
            return {
                doc,
                body,
                weightKg: capture?.WeightKg ?? 0,
                kind: capture?.Type ?? "Tare",
                capturedAt: capture?.At ?? doc.UpdatedAt,
            };
        })
        .sort((a, b) => b.doc.UpdatedAt.localeCompare(a.doc.UpdatedAt));

/** "That vehicle has a ticket awaiting its second weight." */
export const findOpenTicketForVehicle = (
    docs: DocRow[],
    vehicleNo: string,
): OpenTicketSummary | undefined =>
    vehicleNo.trim()
        ? listOpenTickets(docs).find((t) => sameVehicle(t.body.VehicleNo ?? "", vehicleNo))
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
        .sort((a, b) => b.doc.UpdatedAt.localeCompare(a.doc.UpdatedAt));
    return candidates[0];
};
