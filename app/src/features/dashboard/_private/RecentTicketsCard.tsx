import { useMemo } from "react";

import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { formatDateTimeInFmt, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import type { TicketRow } from "@features/reports";
import { formatTicketNo } from "@features/weighing";
import { useTranslation } from "@i18n/useTranslation";

const RECENT_COUNT = 6;

const buildRecentColumns = (
    t: (key: string) => string,
    lang: string,
    weightUnit: WeightUnit,
    dateFmt: string,
    timeFmt: "24" | "12",
): DataTableColumn<TicketRow>[] => [
    {
        key: "no",
        header: t("dashboard.recent.col.ticket"),
        render: (row) => <span className="num">{formatTicketNo(row.docSeq)}</span>,
    },
    { key: "veh", header: t("dashboard.recent.col.vehicle"), render: (row) => row.vehicleNo || "—" },
    { key: "party", header: t("dashboard.recent.col.party"), render: (row) => row.party || "—" },
    { key: "mat", header: t("dashboard.recent.col.material"), render: (row) => row.material || "—" },
    {
        key: "net",
        header: t("dashboard.recent.col.net"),
        numeric: true,
        render: (row) => (row.netKg !== null ? formatWeightIn(row.netKg, weightUnit) : "—"),
    },
    {
        key: "at",
        header: t("dashboard.recent.col.at"),
        render: (row) => formatDateTimeInFmt(row.at, lang, dateFmt, timeFmt),
    },
];

export interface RecentTicketsCardProps {
    rows: TicketRow[];
    /** Settings' `Formats.WeightUnit` — the Net column displays in it. */
    weightUnit: WeightUnit;
    /** Settings' `Formats.DateFmt`/`TimeFmt` — the "at" column renders in them. */
    dateFmt: string;
    timeFmt: "24" | "12";
}

// Split out of DashboardScreen (over the line budget — docs/CodingStandards.md)
// — the bottom "Recent tickets" card. Now uses the t() function for
// translatable strings. Columns are built dynamically since they depend on t().
export const RecentTicketsCard = ({ rows, weightUnit, dateFmt, timeFmt }: RecentTicketsCardProps) => {
    const { t, lang } = useTranslation();
    const columns = useMemo(
        () => buildRecentColumns(t, lang, weightUnit, dateFmt, timeFmt),
        [t, lang, weightUnit, dateFmt, timeFmt],
    );

    return (
        <Card
            title={<span className="lbl">{t("dashboard.recent.title")}</span>}
            headerRight={<span className="lbl">{t("dashboard.recent.subtitle")}</span>}
        >
            <DataTable
                columns={columns}
                rows={rows.slice(0, RECENT_COUNT)}
                getRowId={(row) => row.docId}
                emptyMessage={t("dashboard.recent.empty")}
            />
        </Card>
    );
};
