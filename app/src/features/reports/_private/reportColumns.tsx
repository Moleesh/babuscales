import { Button } from "@components/Button";
import type { DataTableColumn } from "@components/DataTable";
import { formatMoney, formatWeightKg } from "@constants/numberFormat";
import type { DocRow } from "@db/types";
import { formatTicketNo } from "@features/weighing";

import { groupLabel } from "../reportRows";
import type { GroupKey, SummaryRow, TicketRow } from "../reportRows";

const formatWeightCell = (kg: number | null): string => (kg === null ? "—" : `${formatWeightKg(kg)} kg`);

export interface BuildTicketColumnsArgs {
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    styles: CSSModuleClasses;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Tickets-view DataTable columns,
// unchanged from the inline version it replaces.
export const buildTicketColumns = ({
    onOpenTicket,
    amountDp,
    styles,
}: BuildTicketColumnsArgs): DataTableColumn<TicketRow>[] => [
    { key: "no", header: "Ticket", render: (row) => <span className="num">{formatTicketNo(row.docSeq)}</span> },
    { key: "veh", header: "Vehicle", render: (row) => row.vehicleNo || "—" },
    { key: "party", header: "Party", render: (row) => row.party || "—" },
    { key: "mat", header: "Material", render: (row) => row.material || "—" },
    { key: "tare", header: "Tare", numeric: true, render: (row) => formatWeightCell(row.tareKg) },
    { key: "gross", header: "Gross", numeric: true, render: (row) => formatWeightCell(row.grossKg) },
    { key: "net", header: "Net", numeric: true, render: (row) => formatWeightCell(row.netKg) },
    {
        key: "charge",
        header: "Charge",
        numeric: true,
        render: (row) => (row.charge === null ? "—" : formatMoney(row.charge, amountDp)),
    },
    { key: "at", header: "At", render: (row) => new Date(row.at).toLocaleString() },
    {
        key: "status",
        header: "Status",
        render: (row) =>
            row.isCancelled ? (
                <span className={styles.cancelled}>Cancelled</span>
            ) : row.isOpen ? (
                <span className={styles.waiting}>Waiting</span>
            ) : (
                "Complete"
            ),
    },
    {
        key: "action",
        header: "",
        render: (row) =>
            row.isCancelled ? null : (
                <Button onClick={() => onOpenTicket(row.doc)}>{row.isOpen ? "Resume" : "Reprint"}</Button>
            ),
    },
];

export interface BuildSummaryColumnsArgs {
    groupBy: GroupKey;
    amountDp: 0 | 2;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Summary-view DataTable columns,
// unchanged from the inline version it replaces.
export const buildSummaryColumns = ({
    groupBy,
    amountDp,
}: BuildSummaryColumnsArgs): DataTableColumn<SummaryRow>[] => [
    { key: "key", header: groupLabel(groupBy), render: (row) => row.key },
    {
        key: "count",
        header: "Tickets",
        numeric: true,
        render: (row) => <span className="num">{row.ticketCount}</span>,
    },
    {
        key: "tonnes",
        header: "Net tonnes",
        numeric: true,
        render: (row) => <span className="num">{row.netTonnes.toFixed(2)}</span>,
    },
    {
        key: "charge",
        header: "Charge",
        numeric: true,
        render: (row) => <span className="num">{formatMoney(row.charge, amountDp)}</span>,
    },
];
