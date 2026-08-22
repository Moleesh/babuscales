import { deriveWeights, isOpenTicket, parseTicketBody } from "@db/ticketBody";
import type { DocRow } from "@db/types";

// "There is no Tickets tab... a ticket list is a report that
// has not been grouped yet." This is the one place `doc` rows become the
// flat, sortable shape both the Tickets view and the Summary view read
// from. `charge` is a plain operator-entered ticket field — no auto-calc,
// no need for charge calculation — so it's just read straight
// off the body like challanNo, absent (null) until someone types one in.

export interface TicketRow {
    doc: DocRow;
    docId: string;
    docSeq: number | null;
    /** `doc.SeriesEpoch` — which "Reset the counter now" generation this ticket belongs to. Used only by `filterRowsBySeries` to tell current-series tickets from old/backed ones; never shown as its own column. */
    seriesEpoch: number;
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
    /** Parked with exactly one weight. */
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
                seriesEpoch: doc.SeriesEpoch,
                vehicleNo: body.VehicleNo ?? "",
                party: body.Party ?? "",
                material: body.Material ?? "",
                transporter: body.Transporter ?? "",
                challanNo: body.ChallanNo ?? "",
                tareKg: weights.tareKg,
                grossKg: weights.grossKg,
                netKg: weights.netKg,
                charge: body.Charge ?? null,
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

/**
 * Reports always scopes to exactly one numbering series at a time —
 * `row.seriesEpoch` matching the caller's chosen `epoch` (either
 * `Numbering.CurrentEpoch`, settingsSchema.ts, or a prior series picked
 * from the "include tickets from before the last reset" dropdown,
 * ReportsDateRangeRow.tsx). Older tickets from before a reset are kept
 * forever, never dropped at the query layer (useReportDocs.ts still
 * fetches every doc) — this is a pure display filter, same shape as
 * `filterRowsByDateRange` above, so a reset can never produce two tickets
 * that look identical (same formatted number) in the same view. Scoping to
 * exactly one series (never a merge across series) is deliberate — a
 * vehicle/ticket-no search across two series could otherwise collide on
 * the same displayed number.
 */
export const filterRowsBySeries = (rows: TicketRow[], epoch: number): TicketRow[] =>
    rows.filter((row) => row.seriesEpoch === epoch);

/** One entry per numbering series a ticket actually exists in, "Current"
 * first — feeds the "include tickets from before the last reset" dropdown
 * (ReportsDateRangeRow.tsx). There is no dedicated epoch registry
 * (grepped the Rust backend/IPC layer — `reset_doc_series` just bumps a
 * counter, DataPort.ts's own comment on `resetDocSeries`), so this derives
 * the list from whatever `SeriesEpoch` values are actually present on the
 * already-loaded docs, labeling each prior one by its earliest ticket's
 * date so an operator can tell series apart without needing reset
 * timestamps the backend never recorded. */
export interface SeriesEpochOption {
    epoch: number;
    label: string;
}

export const listSeriesEpochOptions = (
    rows: TicketRow[],
    currentEpoch: number,
    t: Translate,
): SeriesEpochOption[] => {
    const earliestByEpoch = new Map<number, string>();
    for (const row of rows) {
        const existing = earliestByEpoch.get(row.seriesEpoch);
        if (!existing || row.at < existing) earliestByEpoch.set(row.seriesEpoch, row.at);
    }
    const priorEpochs = Array.from(earliestByEpoch.keys())
        .filter((epoch) => epoch !== currentEpoch)
        .sort((a, b) => b - a);
    return [
        { epoch: currentEpoch, label: t("reports.series.current") },
        ...priorEpochs.map((epoch) => ({
            epoch,
            label: `${t("reports.series.priorPrefix")} ${earliestByEpoch.get(epoch)?.slice(0, 10) ?? ""}`,
        })),
    ];
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

// Task: "if I have like more than 100 it will kill the flow" — DataTable
// already windows its own DOM rows, but the Tickets view still handed it
// every matching row at once (a site running a full day/week can easily
// clear a few hundred). Real pagination — a bounded slice per page — caps
// both what DataTable has to window *and* what a screen reader/keyboard
// tab-through has to step across, not just what's actually painted.
// Print/export deliberately still read the *full* `visibleRows`
// (useReportsScreenData.ts), not the paginated slice — a report should
// never silently print only the current page.
export const TICKET_PAGE_SIZE = 50;

export const ticketPageCount = (rowCount: number, pageSize: number = TICKET_PAGE_SIZE): number =>
    Math.max(1, Math.ceil(rowCount / pageSize));

/** Clamps `pageIndex` into range first — a filter/search/sort change can
 * leave a stale page index past the new (shorter) result set. */
export const paginateTicketRows = (
    rows: TicketRow[],
    pageIndex: number,
    pageSize: number = TICKET_PAGE_SIZE,
): TicketRow[] => {
    const clamped = Math.min(Math.max(pageIndex, 0), ticketPageCount(rows.length, pageSize) - 1);
    const start = clamped * pageSize;
    return rows.slice(start, start + pageSize);
};

/** Ticket-column keys the report-builder wizard can show/hide — mirrors reportColumns.tsx's `buildTicketColumns`
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
