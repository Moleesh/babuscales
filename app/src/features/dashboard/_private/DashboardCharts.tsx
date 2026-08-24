import { Card } from "@components/Card";
import { Tooltip } from "@components/Tooltip";
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
// Must match `.bars`' content-box height in DashboardScreen.module.css.
// Bars are sized in px (not `height: X%`) so the Tooltip trigger they sit
// inside only needs to be as tall as the bar itself, not the whole column
// — a percent height needs an ancestor with a *resolved* height, which
// meant giving the Tooltip wrapper `height: 100%` too, and that stretched
// tooltip's positioned ancestor to the full column, misaligning the bubble
// to the top of the chart instead of the top of the (usually much shorter)
// bar. See DashboardScreen.module.css's own `.bars`/`.split` comment for
// why 173 (190 total to match Material Split's card, minus the 17px
// reserved for the axis label row).
const BAR_AREA_PX = 173;

interface ActivityBarChartProps {
    buckets: ActivityBucket[];
    period: DashboardPeriod;
}

// The hour/period bar chart — pulled out of DashboardCharts purely to stay
// under the file's own line budget.
const ActivityBarChart = ({ buckets, period }: ActivityBarChartProps) => {
    const { t } = useTranslation();
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    // Task: "wont it be better if we can get a load count on both the
    // charts" — a plain sum of every bucket/row's own `count`, shown next
    // to each card's existing headerRight rather than as a new element, so
    // both charts read "range/title · N tickets|loads" the same way.
    const totalTickets = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

    return (
        <Card
            title={<span className="lbl">{t(`dashboard.chart.activity.${period}`)}</span>}
            headerRight={
                <span className="lbl">
                    {buckets[0]?.label ?? ""} — {buckets[buckets.length - 1]?.label ?? ""} ·{" "}
                    {totalTickets} {t("dashboard.chart.tickets")}
                </span>
            }
        >
            <div className={styles.bars}>
                {buckets.map((bucket) => (
                    <Tooltip
                        key={bucket.id}
                        style={{ flex: 1 }}
                        label={`${bucket.label}: ${bucket.count} ${t("dashboard.chart.tickets")}`}
                    >
                        <div
                            className={`${styles.bar} ${bucket.current ? styles.barNow : ""}`}
                            style={{ height: `${Math.max(2, (bucket.count / maxCount) * BAR_AREA_PX)}px` }}
                        >
                            <span className={styles.barLabel}>{bucket.label}</span>
                        </div>
                    </Tooltip>
                ))}
            </div>
        </Card>
    );
};

interface MaterialSplitChartProps {
    materialSplit: MaterialSplitEntry[];
    weightUnit: WeightUnit;
}

// The material-split list — pulled out of DashboardCharts purely to stay
// under the file's own line budget.
const MaterialSplitChart = ({ materialSplit, weightUnit }: MaterialSplitChartProps) => {
    const { t, lang } = useTranslation();
    const totalLoads = materialSplit.reduce((sum, entry) => sum + entry.count, 0);

    return (
        <Card
            title={<span className="lbl">{t("dashboard.chart.material")}</span>}
            headerRight={
                materialSplit.length > 0 && (
                    <span className="lbl">
                        {totalLoads} {t("dashboard.chart.loads")}
                    </span>
                )
            }
        >
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
                            <span className={styles.splitValue}>
                                <span className="num">{formatWeightIn(entry.tonnes * 1000, weightUnit, lang)}</span>
                                <span className={styles.hint}>
                                    {entry.count} {t("dashboard.chart.loads")}
                                </span>
                            </span>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};

export const DashboardCharts = ({ buckets, period, materialSplit, weightUnit }: DashboardChartsProps) => (
    <div className={styles.grid2}>
        <ActivityBarChart buckets={buckets} period={period} />
        <MaterialSplitChart materialSplit={materialSplit} weightUnit={weightUnit} />
    </div>
);
