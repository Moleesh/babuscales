import { Button } from "@components/Button";
import type { DataTableColumn } from "@components/DataTable";
import { formatDateTimeInFmt, formatMoney, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import type { DocRow } from "@db/types";
import { formatTicketNo } from "@features/weighing";

import { groupLabel } from "../reportRows";
import type { GroupKey, SummaryRow, TicketColumnKey, TicketRow, Translate } from "../reportRows";

const formatWeightCell = (kg: number | null, weightUnit: WeightUnit): string =>
    kg === null ? "—" : formatWeightIn(kg, weightUnit);

export interface BuildTicketColumnsArgs {
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    /** Settings' `Formats.WeightUnit` — the Tare/Gross/Net columns display in it. */
    weightUnit: WeightUnit;
    styles: CSSModuleClasses;
    t: Translate;
    /** i18n's active language — decides the locale the "at" column's
     * timestamp renders in (@constants/numberFormat's formatDateTimeInFmt). */
    lang: string;
    /** Settings' `Formats.DateFmt`/`TimeFmt` — the "at" column renders in them. */
    dateFmt: string;
    timeFmt: "24" | "12";
    /** Report-builder wizard MVP — `null`
     * (the default) shows every column, same as before the wizard existed.
     * A non-null list restricts the table to just those keys plus the
     * always-shown trailing "action" column. */
    visibleColumnKeys?: TicketColumnKey[] | null;
}

const renderStatusCell = (row: TicketRow, styles: CSSModuleClasses, t: Translate) =>
    row.isCancelled ? (
        <span className={styles.cancelled}>{t("reports.status.cancelled")}</span>
    ) : row.isOpen ? (
        <span className={styles.waiting}>{t("reports.status.waiting")}</span>
    ) : (
        t("reports.status.complete")
    );

// Reports rework, item 5 — "Reprint" removed from every ticket row here;
// reprinting now only lives on the Weighing screen. Resume (for a still-open
// ticket) is kept — it's a different action, not a reprint.
const renderActionCell = (row: TicketRow, onOpenTicket: (doc: DocRow) => void, t: Translate) =>
    row.isCancelled || !row.isOpen ? null : (
        <Button onClick={() => onOpenTicket(row.doc)}>{t("reports.action.resume")}</Button>
    );

// Split out of buildTicketColumns (over the line/complexity budget —
// docs/CodingStandards.md) — the full, unfiltered column list, unchanged
// from the inline version it replaces.
const buildAllTicketColumns = ({
    onOpenTicket,
    amountDp,
    weightUnit,
    styles,
    t,
    lang,
    dateFmt,
    timeFmt,
}: BuildTicketColumnsArgs): DataTableColumn<TicketRow>[] => [
    {
        key: "no",
        header: t("reports.col.ticket"),
        render: (row) => <span className="num">{formatTicketNo(row.docSeq)}</span>,
    },
    { key: "veh", header: t("reports.col.vehicle"), render: (row) => row.vehicleNo || "—" },
    { key: "party", header: t("reports.col.party"), render: (row) => row.party || "—" },
    { key: "mat", header: t("reports.col.material"), render: (row) => row.material || "—" },
    {
        key: "tare",
        header: t("reports.col.tare"),
        numeric: true,
        render: (row) => formatWeightCell(row.tareKg, weightUnit),
    },
    {
        key: "gross",
        header: t("reports.col.gross"),
        numeric: true,
        render: (row) => formatWeightCell(row.grossKg, weightUnit),
    },
    {
        key: "net",
        header: t("reports.col.net"),
        numeric: true,
        render: (row) => formatWeightCell(row.netKg, weightUnit),
    },
    {
        key: "charge",
        header: t("reports.col.charge"),
        numeric: true,
        render: (row) => (row.charge === null ? "—" : formatMoney(row.charge, amountDp)),
    },
    {
        key: "at",
        header: t("reports.col.at"),
        render: (row) => formatDateTimeInFmt(row.at, lang, dateFmt, timeFmt),
    },
    {
        key: "status",
        header: t("reports.col.status"),
        render: (row) => renderStatusCell(row, styles, t),
    },
    { key: "action", header: "", render: (row) => renderActionCell(row, onOpenTicket, t) },
];

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Tickets-view DataTable columns.
// `visibleColumnKeys` (set by the report-builder
// wizard) filters the list down; `null` (the default) keeps every column,
// same as before the wizard existed.
// Reports rework, item 6 — Tickets' columns here are a fixed built-in set
// (TICKET_COLUMN_KEYS/reportRows.ts: no/veh/party/mat/tare/gross/net/
// charge/at/status/action), not one column per dynamic schema Field, so a
// Field's Hide/Show toggle in Settings (FieldSchemaCard.tsx) has nothing to
// retroactively break here — a saved report's `visibleColumnKeys` always
// refers to one of these constant keys, never a schema Field id, so it can
// never go stale the way a schema-Field-keyed column list could. The
// `keys.includes(column.key)` filter below is already the "gracefully drop
// anything no longer recognized" behaviour the task asked for: any key that
// stops existing in `all` (e.g. a future column removed from the fixed set)
// just silently disappears from the table instead of erroring or rendering
// missing data. If Reports later grows per-schema-Field columns, the
// analogous fix there is: default a new column-picker checkbox from the
// field's live Hide/Show state (don't let the saved report's old value
// override it), and filter the rendered columns down to
// `schemaFields.map(f => f.Id)` so a field removed from the schema entirely
// just drops its column instead of crashing on missing data.
export const buildTicketColumns = (args: BuildTicketColumnsArgs): DataTableColumn<TicketRow>[] => {
    const all = buildAllTicketColumns(args);
    const { visibleColumnKeys = null } = args;
    if (!visibleColumnKeys) return all;
    const keys: string[] = visibleColumnKeys;
    return all.filter((column) => column.key === "action" || keys.includes(column.key));
};

export interface BuildSummaryColumnsArgs {
    groupBy: GroupKey;
    amountDp: 0 | 2;
    t: Translate;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Summary-view DataTable columns,
// unchanged from the inline version it replaces.
export const buildSummaryColumns = ({
    groupBy,
    amountDp,
    t,
}: BuildSummaryColumnsArgs): DataTableColumn<SummaryRow>[] => [
    { key: "key", header: groupLabel(groupBy, t), render: (row) => row.key },
    {
        key: "count",
        header: t("reports.col.tickets"),
        numeric: true,
        render: (row) => <span className="num">{row.ticketCount}</span>,
    },
    {
        key: "tonnes",
        header: t("reports.col.netTonnes"),
        numeric: true,
        render: (row) => <span className="num">{row.netTonnes.toFixed(2)}</span>,
    },
    {
        key: "charge",
        header: t("reports.col.charge"),
        numeric: true,
        render: (row) => <span className="num">{formatMoney(row.charge, amountDp)}</span>,
    },
];
