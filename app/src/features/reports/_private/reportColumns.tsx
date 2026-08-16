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

const renderActionCell = (row: TicketRow, onOpenTicket: (doc: DocRow) => void, t: Translate) =>
    row.isCancelled ? null : (
        <Button onClick={() => onOpenTicket(row.doc)}>
            {row.isOpen ? t("reports.action.resume") : t("reports.action.reprint")}
        </Button>
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
