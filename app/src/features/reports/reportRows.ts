import { deriveWeights, isOpenTicket, parseTicketBody } from "@db/ticketBody";
import type { DocRow } from "@db/types";

// PLAN §13.1 — "there is no Tickets tab... a ticket list is a report that
// has not been grouped yet." This is the one place `doc` rows become the
// flat, sortable shape both the Tickets view and the Summary view read
// from. No billing/charge fields yet — the rate/charge engine (PLAN §4.9)
// is a tracked gap, so Summary carries tonnage and ticket counts only.

export interface TicketRow {
    doc: DocRow;
    docId: string;
    docSeq: number | null;
    vehicleNo: string;
    party: string;
    material: string;
    transporter: string;
    challanNo: string;
    tareKg: number | null;
    grossKg: number | null;
    netKg: number | null;
    isCancelled: boolean;
    /** Parked with exactly one weight — PLAN §7.5. */
    isOpen: boolean;
    /** Latest capture's timestamp, or the doc's own update time if it has none yet. */
    at: string;
}

export const buildTicketRows = (docs: DocRow[]): TicketRow[] =>
    docs
        .map((doc): TicketRow => {
            const body = parseTicketBody(doc.Body);
            const weights = deriveWeights(body.Captures);
            const last = body.Captures[body.Captures.length - 1];
            return {
                doc,
                docId: doc.DocId,
                docSeq: doc.DocSeq,
                vehicleNo: body.VehicleNo ?? "",
                party: body.Party ?? "",
                material: body.Material ?? "",
                transporter: body.Transporter ?? "",
                challanNo: body.ChallanNo ?? "",
                tareKg: weights.tareKg,
                grossKg: weights.grossKg,
                netKg: weights.netKg,
                isCancelled: doc.IsCancelled,
                isOpen: isOpenTicket(doc.IsCancelled, body.Captures),
                at: last?.At ?? doc.UpdatedAt,
            };
        })
        .sort((a, b) => b.at.localeCompare(a.at));

export type TicketRowFilter = "all" | "half" | "both";

export const filterTicketRows = (
    rows: TicketRow[],
    query: string,
    filter: TicketRowFilter,
): TicketRow[] => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
        if (filter === "half" && !row.isOpen) return false;
        if (filter === "both" && row.netKg === null) return false;
        if (!q) return true;
        const haystack = [row.docSeq, row.vehicleNo, row.party, row.material, row.challanNo]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return haystack.includes(q);
    });
};

export type GroupKey = "material" | "party" | "vehicleNo" | "transporter";

export interface SummaryRow {
    key: string;
    ticketCount: number;
    netTonnes: number;
}

/** Only rows with both weights in and not cancelled contribute — a half-open ticket has nothing to total yet. */
export const summarizeTicketRows = (rows: TicketRow[], groupBy: GroupKey): SummaryRow[] => {
    const totals = new Map<string, SummaryRow>();
    for (const row of rows) {
        if (row.isCancelled || row.netKg === null) continue;
        const key = row[groupBy] || "—";
        const existing = totals.get(key) ?? { key, ticketCount: 0, netTonnes: 0 };
        existing.ticketCount += 1;
        existing.netTonnes += row.netKg / 1000;
        totals.set(key, existing);
    }
    return Array.from(totals.values()).sort((a, b) => b.netTonnes - a.netTonnes);
};
