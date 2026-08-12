import { deriveWeights, isOpenTicket, parseTicketBody } from "@db/ticketBody";
import type { DocRow } from "@db/types";
import { computeCharge } from "@engines/billing";

// PLAN §13.1 — "there is no Tickets tab... a ticket list is a report that
// has not been grouped yet." This is the one place `doc` rows become the
// flat, sortable shape both the Tickets view and the Summary view read
// from. `charge` is the flat per-ticket amount (engines/billing) — a real
// per-vehicle-type/material rate table is still a tracked gap
// (app/README.md), so this is a real number, just not yet a configurable one.

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
    charge: number | null;
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
                charge: computeCharge(weights.netKg !== null),
                isCancelled: doc.IsCancelled,
                isOpen: isOpenTicket(doc.IsCancelled, body.Captures),
                at: last?.At ?? doc.UpdatedAt,
            };
        })
        .sort((a, b) => b.at.localeCompare(a.at));

export type ReportView = "tickets" | "summary";

export type Translate = (key: string) => string;

export const viewOptions = (t: Translate): { value: ReportView; label: string }[] => [
    { value: "tickets", label: t("reports.view.tickets") },
    { value: "summary", label: t("reports.view.summary") },
];

export type TicketRowFilter = "all" | "half" | "both";

/** Bare value lists (no labels) for validating a recalled saved-report definition against — doesn't need a `t`, unlike the label-bearing `filterOptions`/`groupOptions` above/below. */
export const TICKET_ROW_FILTER_VALUES: TicketRowFilter[] = ["all", "half", "both"];

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

/**
 * Date-range filter over a row's `at` timestamp, by date-only prefix
 * (`yyyy-MM-dd`) against `from`/`to` (also `yyyy-MM-dd`, from a native
 * `<input type="date">`). Both bounds inclusive; an empty bound means "no
 * limit on that side". Empty `from` and empty `to` together is a true
 * no-op — returns `rows` unchanged — so existing behavior with no date
 * filter set is completely unaffected.
 */
export const filterRowsByDateRange = (rows: TicketRow[], from: string, to: string): TicketRow[] => {
    if (!from && !to) return rows;
    return rows.filter((row) => {
        const date = row.at.slice(0, 10);
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
    });
};

export const filterOptions = (t: Translate): { value: TicketRowFilter; label: string }[] => [
    { value: "all", label: t("reports.filter.all") },
    { value: "half", label: t("reports.filter.half") },
    { value: "both", label: t("reports.filter.both") },
];

export type TicketSortKey = "at" | "docSeq" | "vehicleNo" | "party" | "material" | "netKg" | "charge";

export const TICKET_SORT_KEY_VALUES: TicketSortKey[] = [
    "at",
    "docSeq",
    "vehicleNo",
    "party",
    "material",
    "netKg",
    "charge",
];

export type SortDir = "asc" | "desc";

export const sortOptions = (t: Translate): { value: TicketSortKey; label: string }[] => [
    { value: "at", label: t("reports.sort.at") },
    { value: "docSeq", label: t("reports.sort.ticket") },
    { value: "vehicleNo", label: t("reports.sort.vehicle") },
    { value: "party", label: t("reports.sort.party") },
    { value: "material", label: t("reports.sort.material") },
    { value: "netKg", label: t("reports.sort.net") },
    { value: "charge", label: t("reports.sort.charge") },
];

/** Nulls always sort last regardless of direction — a missing weight/charge is "unknown", not "zero". */
const compareTicketRows = (a: TicketRow, b: TicketRow, sortKey: TicketSortKey): number => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv));
};

export const sortTicketRows = (
    rows: TicketRow[],
    sortKey: TicketSortKey,
    sortDir: SortDir,
): TicketRow[] => {
    const sorted = [...rows].sort((a, b) => compareTicketRows(a, b, sortKey));
    return sortDir === "asc" ? sorted : sorted.reverse();
};

/** Ticket-column keys the report-builder wizard (task: Reports rework,
 * item 4) can show/hide — mirrors reportColumns.tsx's `buildTicketColumns`
 * key list 1:1, minus "action" (Resume/Reprint isn't a data column, always
 * shown). */
export const TICKET_COLUMN_KEYS = [
    "no",
    "veh",
    "party",
    "mat",
    "tare",
    "gross",
    "net",
    "charge",
    "at",
    "status",
] as const;

export type TicketColumnKey = (typeof TICKET_COLUMN_KEYS)[number];

export const ticketColumnOptions = (t: Translate): { value: TicketColumnKey; label: string }[] => [
    { value: "no", label: t("reports.col.ticket") },
    { value: "veh", label: t("reports.col.vehicle") },
    { value: "party", label: t("reports.col.party") },
    { value: "mat", label: t("reports.col.material") },
    { value: "tare", label: t("reports.col.tare") },
    { value: "gross", label: t("reports.col.gross") },
    { value: "net", label: t("reports.col.net") },
    { value: "charge", label: t("reports.col.charge") },
    { value: "at", label: t("reports.col.at") },
    { value: "status", label: t("reports.col.status") },
];

export type GroupKey = "material" | "party" | "vehicleNo" | "transporter";

export const GROUP_KEY_VALUES: GroupKey[] = ["material", "party", "vehicleNo", "transporter"];

export const groupOptions = (t: Translate): { value: GroupKey; label: string }[] => [
    { value: "material", label: t("reports.group.material") },
    { value: "party", label: t("reports.group.party") },
    { value: "vehicleNo", label: t("reports.group.vehicleNo") },
    { value: "transporter", label: t("reports.group.transporter") },
];

export const groupLabel = (key: GroupKey, t: Translate): string =>
    groupOptions(t).find((option) => option.value === key)?.label ?? t("reports.group.fallback");

export interface SummaryRow {
    key: string;
    ticketCount: number;
    netTonnes: number;
    charge: number;
}

/** Only rows with both weights in and not cancelled contribute — a half-open ticket has nothing to total yet. */
export const summarizeTicketRows = (rows: TicketRow[], groupBy: GroupKey): SummaryRow[] => {
    const totals = new Map<string, SummaryRow>();
    for (const row of rows) {
        if (row.isCancelled || row.netKg === null) continue;
        const key = row[groupBy] || "—";
        const existing = totals.get(key) ?? { key, ticketCount: 0, netTonnes: 0, charge: 0 };
        existing.ticketCount += 1;
        existing.netTonnes += row.netKg / 1000;
        existing.charge += row.charge ?? 0;
        totals.set(key, existing);
    }
    return Array.from(totals.values()).sort((a, b) => b.netTonnes - a.netTonnes);
};
