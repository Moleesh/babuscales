import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { formatWeightKg } from "@constants/numberFormat";
import type { TicketRow } from "@features/reports";
import { formatTicketNo } from "@features/weighing";

const RECENT_COUNT = 6;

const RECENT_COLUMNS: DataTableColumn<TicketRow>[] = [
    {
        key: "no",
        header: "Ticket",
        render: (row) => <span className="num">{formatTicketNo(row.docSeq)}</span>,
    },
    { key: "veh", header: "Vehicle", render: (row) => row.vehicleNo || "—" },
    { key: "party", header: "Party", render: (row) => row.party || "—" },
    { key: "mat", header: "Material", render: (row) => row.material || "—" },
    {
        key: "net",
        header: "Net",
        numeric: true,
        render: (row) => (row.netKg !== null ? `${formatWeightKg(row.netKg)} kg` : "—"),
    },
    { key: "at", header: "At", render: (row) => new Date(row.at).toLocaleString() },
];

export interface RecentTicketsCardProps {
    rows: TicketRow[];
}

// Split out of DashboardScreen (over the line budget — docs/CodingStandards.md)
// — the bottom "Recent tickets" card, unchanged from the inline version it
// replaces. Columns are a module constant since they don't depend on props.
export const RecentTicketsCard = ({ rows }: RecentTicketsCardProps) => (
    <Card
        title={<span className="lbl">Recent tickets</span>}
        headerRight={<span className="lbl">Updates as tickets are saved</span>}
    >
        <DataTable
            columns={RECENT_COLUMNS}
            rows={rows.slice(0, RECENT_COUNT)}
            getRowId={(row) => row.docId}
            emptyMessage="No tickets yet"
        />
    </Card>
);
