import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/DashboardScreen.module.css";
import type { HourBucket, MaterialSplitEntry } from "../dashboardData";

const p2 = (n: number): string => String(n).padStart(2, "0");

export interface DashboardChartsProps {
    hours: HourBucket[];
    currentHour: number;
    materialSplit: MaterialSplitEntry[];
}

// Split out of DashboardScreen (over the line budget — docs/CodingStandards.md)
// — the `.grid2` pair: the hourly bar chart and the material-split list.
// Now uses the t() function for translatable strings.
export const DashboardCharts = ({ hours, currentHour, materialSplit }: DashboardChartsProps) => {
    const { t } = useTranslation();
    const maxHourly = Math.max(1, ...hours.map((h) => h.count));

    return (
        <div className={styles.grid2}>
            <Card
                title={<span className="lbl">{t("dashboard.chart.hourly")}</span>}
                headerRight={
                    <span className="lbl">
                        {p2(hours[0]?.hour ?? 0)}:00 — {p2(hours[hours.length - 1]?.hour ?? 0)}:00
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
            <Card title={<span className="lbl">{t("dashboard.chart.material")}</span>}>
                <div className={styles.split}>
                    {materialSplit.length === 0 ? (
                        <span className={styles.hint}>{t("dashboard.chart.noMaterial")}</span>
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
    );
};
