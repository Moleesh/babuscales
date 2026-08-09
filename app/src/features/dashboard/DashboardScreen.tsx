import { useEffect, useMemo, useState } from "react";

import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { formatMoney, formatWeightKg } from "@constants/numberFormat";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { buildTicketRows } from "@features/reports";
import type { TicketRow } from "@features/reports";
import { useSettings } from "@features/settings";
import { formatTicketNo } from "@features/weighing";

import { computeDashboardKpis, hourlyTicketCounts } from "./dashboardData";
import styles from "./DashboardScreen.module.css";

export interface DashboardScreenProps {
    /** The KPI tile for open tickets doubles as a shortcut to Reports — no filter is forced across the tab switch (Reports owns its own filter state). */
    onNavigateToReports?: () => void;
}

const RECENT_COUNT = 6;
const SPLIT_COUNT = 6;
const p2 = (n: number): string => String(n).padStart(2, "0");

// PLAN §18 — "dashboard (throughput, tonnage, ... top ... materials,
// peak hours...)". ANPR and anomaly detection are not built (app/README.md
// known gaps) — this is the operational slice: today's KPIs (including,
// now, Charge collected — engines/billing), the hourly shape of the day,
// where the tonnage is coming from, and the most recent tickets.
export const DashboardScreen = ({ onNavigateToReports }: DashboardScreenProps) => {
    const db = useDataPort();
    const { settings } = useSettings();
    const [docs, setDocs] = useState<DocRow[]>([]);
    const referenceIso = useMemo(() => new Date().toISOString(), []);

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (!cancelled) setDocs(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    const rows = useMemo(() => buildTicketRows(docs), [docs]);
    const kpis = useMemo(() => computeDashboardKpis(rows, referenceIso), [rows, referenceIso]);
    const hours = useMemo(() => hourlyTicketCounts(rows, referenceIso), [rows, referenceIso]);
    const maxHourly = Math.max(1, ...hours.map((h) => h.count));
    const currentHour = new Date(referenceIso).getHours();

    const materialSplit = useMemo(() => {
        const today = rows.filter(
            (row) =>
                !row.isCancelled &&
                row.netKg !== null &&
                row.at.slice(0, 10) === referenceIso.slice(0, 10),
        );
        const totals = new Map<string, number>();
        for (const row of today) {
            const key = row.material || "—";
            totals.set(key, (totals.get(key) ?? 0) + (row.netKg ?? 0) / 1000);
        }
        const totalTonnes = Array.from(totals.values()).reduce((a, b) => a + b, 0) || 1;
        return Array.from(totals.entries())
            .map(([material, tonnes]) => ({ material, tonnes, share: tonnes / totalTonnes }))
            .sort((a, b) => b.tonnes - a.tonnes)
            .slice(0, SPLIT_COUNT);
    }, [rows, referenceIso]);

    const recentColumns: DataTableColumn<TicketRow>[] = [
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

    return (
        <div className={styles.screen}>
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className="lbl">Tickets today</span>
                    <b className={styles.value}>{kpis.ticketsToday}</b>
                </div>
                <div className={`${styles.kpi} ${styles.accent}`}>
                    <span className="lbl">Net tonnage today</span>
                    <b className={styles.value}>{kpis.netTonnesToday.toFixed(1)} t</b>
                </div>
                <div className={styles.kpi}>
                    <span className="lbl">Charge collected today</span>
                    <b className={styles.value}>
                        {formatMoney(kpis.chargeToday, settings.Formats.AmountDp)}
                    </b>
                </div>
                {onNavigateToReports ? (
                    <button type="button" className={styles.kpi} onClick={onNavigateToReports}>
                        <span className="lbl">Waiting for a second weight</span>
                        <b className={styles.value}>{kpis.waitingCount}</b>
                        <span className={styles.hint}>Open in Reports →</span>
                    </button>
                ) : (
                    <div className={styles.kpi}>
                        <span className="lbl">Waiting for a second weight</span>
                        <b className={styles.value}>{kpis.waitingCount}</b>
                    </div>
                )}
                <div className={styles.kpi}>
                    <span className="lbl">Avg net / ticket today</span>
                    <b className={styles.value}>
                        {kpis.avgNetKgPerTicket
                            ? formatWeightKg(Math.round(kpis.avgNetKgPerTicket))
                            : "—"}{" "}
                        kg
                    </b>
                </div>
            </div>

            <div className={styles.grid2}>
                <Card
                    title={<span className="lbl">Tickets by hour</span>}
                    headerRight={
                        <span className="lbl">
                            {p2(hours[0]?.hour ?? 0)}:00 — {p2(hours[hours.length - 1]?.hour ?? 0)}
                            :00
                        </span>
                    }
                >
                    <div className={styles.bars}>
                        {hours.map((bucket) => (
                            <div
                                key={bucket.hour}
                                className={`${styles.bar} ${bucket.hour === currentHour ? styles.barNow : ""}`}
                                style={{ height: `${(bucket.count / maxHourly) * 100}%` }}
                            >
                                <span className={styles.barLabel}>{p2(bucket.hour)}</span>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card title={<span className="lbl">Material split · today</span>}>
                    <div className={styles.split}>
                        {materialSplit.length === 0 ? (
                            <span className={styles.hint}>No completed tickets yet today.</span>
                        ) : (
                            materialSplit.map((entry) => (
                                <div key={entry.material} className={styles.splitRow}>
                                    <span>{entry.material}</span>
                                    <span className={styles.track}>
                                        <i style={{ width: `${entry.share * 100}%` }} />
                                    </span>
                                    <span className="num" style={{ textAlign: "right" }}>
                                        {entry.tonnes.toFixed(1)} t
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            <Card
                title={<span className="lbl">Recent tickets</span>}
                headerRight={<span className="lbl">Updates as tickets are saved</span>}
            >
                <DataTable
                    columns={recentColumns}
                    rows={rows.slice(0, RECENT_COUNT)}
                    getRowId={(row) => row.docId}
                    emptyMessage="No tickets yet"
                />
            </Card>
        </div>
    );
};
