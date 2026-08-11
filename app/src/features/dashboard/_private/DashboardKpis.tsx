import { formatMoney, formatWeightKg } from "@constants/numberFormat";

import type { DashboardKpis as DashboardKpisData } from "../dashboardData";
import styles from "../DashboardScreen.module.css";

export interface DashboardKpisProps {
    kpis: DashboardKpisData;
    amountDp: 0 | 2;
    onNavigateToReports?: () => void;
}

// Split out of DashboardScreen (over the line budget — docs/CodingStandards.md)
// — the top KPI strip, unchanged from the inline version it replaces. The
// "waiting" tile is a `<button>` instead of a `<div>` only when
// onNavigateToReports is wired up — see DashboardScreenProps' own comment
// for why nothing forces a filter across the tab switch.
export const DashboardKpis = ({ kpis, amountDp, onNavigateToReports }: DashboardKpisProps) => (
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
            <b className={styles.value}>{formatMoney(kpis.chargeToday, amountDp)}</b>
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
                {kpis.avgNetKgPerTicket ? formatWeightKg(Math.round(kpis.avgNetKgPerTicket)) : "—"} kg
            </b>
        </div>
    </div>
);
