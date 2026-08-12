import { formatMoney, formatWeightIn, formatWeightKg } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/DashboardScreen.module.css";
import type { DashboardKpis as DashboardKpisData } from "../dashboardData";

export interface DashboardKpisProps {
    kpis: DashboardKpisData;
    amountDp: 0 | 2;
    /** Settings' Amount rounding pane — "in india we use kg instead of ton" (PLAN §21), defaults to kg. */
    weightUnit: WeightUnit;
    onNavigateToReports?: () => void;
}

// Split out of DashboardScreen (over the line budget — docs/CodingStandards.md)
// — the top KPI strip. Now uses the t() function for translatable strings.
// The "waiting" tile is a `<button>` instead of a `<div>` only when
// onNavigateToReports is wired up — see DashboardScreenProps' own comment
// for why nothing forces a filter across the tab switch.
export const DashboardKpis = ({ kpis, amountDp, weightUnit, onNavigateToReports }: DashboardKpisProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.kpis}>
            <div className={styles.kpi}>
                <span className="lbl">{t("dashboard.kpi.tickets")}</span>
                <b className={styles.value}>{kpis.ticketsToday}</b>
            </div>
            <div className={`${styles.kpi} ${styles.accent}`}>
                <span className="lbl">{t("dashboard.kpi.tonnage")}</span>
                <b className={styles.value}>{formatWeightIn(kpis.netTonnesToday * 1000, weightUnit)}</b>
            </div>
            <div className={styles.kpi}>
                <span className="lbl">{t("dashboard.kpi.charge")}</span>
                <b className={styles.value}>{formatMoney(kpis.chargeToday, amountDp)}</b>
            </div>
            {onNavigateToReports ? (
                <button type="button" className={styles.kpi} onClick={onNavigateToReports}>
                    <span className="lbl">{t("dashboard.kpi.waiting")}</span>
                    <b className={styles.value}>{kpis.waitingCount}</b>
                    <span className={styles.hint}>{t("dashboard.kpi.waitingHint")}</span>
                </button>
            ) : (
                <div className={styles.kpi}>
                    <span className="lbl">{t("dashboard.kpi.waiting")}</span>
                    <b className={styles.value}>{kpis.waitingCount}</b>
                </div>
            )}
            <div className={styles.kpi}>
                <span className="lbl">{t("dashboard.kpi.avgNet")}</span>
                <b className={styles.value}>
                    {kpis.avgNetKgPerTicket ? formatWeightKg(Math.round(kpis.avgNetKgPerTicket)) : "—"} kg
                </b>
            </div>
        </div>
    );
};
