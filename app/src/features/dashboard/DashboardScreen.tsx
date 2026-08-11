import { useEffect, useMemo, useState } from "react";

import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { buildTicketRows } from "@features/reports";
import { useSettings } from "@features/settings";

import { DashboardCharts } from "./_private/DashboardCharts";
import { DashboardKpis } from "./_private/DashboardKpis";
import { RecentTicketsCard } from "./_private/RecentTicketsCard";
import { computeDashboardKpis, computeMaterialSplit, hourlyTicketCounts } from "./dashboardData";
import styles from "./DashboardScreen.module.css";

export interface DashboardScreenProps {
    /** The KPI tile for open tickets doubles as a shortcut to Reports — no filter is forced across the tab switch (Reports owns its own filter state). */
    onNavigateToReports?: () => void;
}

const SPLIT_COUNT = 6;

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
    const materialSplit = useMemo(
        () => computeMaterialSplit(rows, referenceIso, SPLIT_COUNT),
        [rows, referenceIso],
    );
    const currentHour = new Date(referenceIso).getHours();

    return (
        <div className={styles.screen}>
            <DashboardKpis
                kpis={kpis}
                amountDp={settings.Formats.AmountDp}
                onNavigateToReports={onNavigateToReports}
            />
            <DashboardCharts hours={hours} currentHour={currentHour} materialSplit={materialSplit} />
            <RecentTicketsCard rows={rows} />
        </div>
    );
};
