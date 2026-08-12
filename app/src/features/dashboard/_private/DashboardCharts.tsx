import { Card } from "@components/Card";
import { formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/DashboardScreen.module.css";
import type { ActivityBucket, DashboardPeriod, MaterialSplitEntry } from "../dashboardData";

export interface DashboardChartsProps {
    buckets: ActivityBucket[];
    period: DashboardPeriod;
    materialSplit: MaterialSplitEntry[];
    weightUnit: WeightUnit;
}

// Split out of DashboardScreen (over the line budget — docs/CodingStandards.md)
// — the `.grid2` pair: the activity bar chart (hour-of-day for "day", a
// coarser bucket for every wider period — see dashboardData's own
// `computeActivityBuckets` comment) and the material-split list.
export const DashboardCharts = ({ buckets, period, materialSplit, weightUnit }: DashboardChartsProps) => {
    const { t } = useTranslation();
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));

    return (
        <div className={styles.grid2}>
            <Card
                title={<span className="lbl">{t(`dashboard.chart.activity.${period}`)}</span>}
                headerRight={
                    <span className="lbl">
                        {buckets[0]?.label ?? ""} — {buckets[buckets.length - 1]?.label ?? ""}
                    </span>
                }
            >
                <div className={styles.bars}>
                    {buckets.map((bucket) => (
                        <div
                            key={bucket.id}
                            className={`${styles.bar} ${bucket.current ? styles.barNow : ""}`}
                            style={{ height: `${(bucket.count / maxCount) * 100}%` }}
                        >
                            <span className={styles.barLabel}>{bucket.label}</span>
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
                                    {formatWeightIn(entry.tonnes * 1000, weightUnit)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
};
