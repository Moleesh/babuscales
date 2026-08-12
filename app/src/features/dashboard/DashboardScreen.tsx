import { useEffect, useMemo, useState } from "react";

import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { buildTicketRows } from "@features/reports";
import { useSettings } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import { DashboardCharts } from "./_private/DashboardCharts";
import { DashboardKpis } from "./_private/DashboardKpis";
import { RecentTicketsCard } from "./_private/RecentTicketsCard";
import styles from "./_styles/DashboardScreen.module.css";
import {
    computeActivityBuckets,
    computeDashboardKpis,
    computeMaterialSplit,
    DASHBOARD_PERIODS,
} from "./dashboardData";
import type { DashboardPeriod } from "./dashboardData";

export interface DashboardScreenProps {
    /** The KPI tile for open tickets doubles as a shortcut to Reports — no filter is forced across the tab switch (Reports owns its own filter state). */
    onNavigateToReports?: () => void;
}

const SPLIT_COUNT = 6;

const buildPeriodOptions = (t: (key: string) => string): SegmentedOption<DashboardPeriod>[] =>
    DASHBOARD_PERIODS.map((period) => ({ value: period, label: t(`dashboard.period.${period}`) }));

// PLAN §18 — "dashboard (throughput, tonnage, ... top ... materials,
// peak hours...)". ANPR and anomaly detection are not built (app/README.md
// known gaps) — this is the operational slice: the selected period's KPIs
// (including Charge collected — engines/billing), that period's activity
// shape, where the tonnage is coming from, and the most recent tickets.
// PLAN §21 — "a drop down to specify if its per day, month, week, year,
// all... change all the column based on that" — `period` drives every
// derived figure below except Recent Tickets (already its own short,
// always-latest list) and the "waiting" KPI (an all-time count by design —
// see DashboardKpis' `waiting` doc note).
export const DashboardScreen = ({ onNavigateToReports }: DashboardScreenProps) => {
    const db = useDataPort();
    const { settings } = useSettings();
    const { t } = useTranslation();
    const [docs, setDocs] = useState<DocRow[]>([]);
    const [period, setPeriod] = useState<DashboardPeriod>("day");
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
    const kpis = useMemo(
        () => computeDashboardKpis(rows, referenceIso, period),
        [rows, referenceIso, period],
    );
    const buckets = useMemo(
        () => computeActivityBuckets(rows, referenceIso, period),
        [rows, referenceIso, period],
    );
    const materialSplit = useMemo(
        () => computeMaterialSplit(rows, referenceIso, SPLIT_COUNT, period),
        [rows, referenceIso, period],
    );

    return (
        <div className={styles.screen}>
            <div className={styles.periodRow}>
                <SegmentedControl
                    options={buildPeriodOptions(t)}
                    value={period}
                    onChange={setPeriod}
                    ariaLabel={t("dashboard.period.ariaLabel")}
                />
            </div>
            <DashboardKpis
                kpis={kpis}
                amountDp={settings.Formats.AmountDp}
                weightUnit={settings.Formats.WeightUnit}
                onNavigateToReports={onNavigateToReports}
            />
            <DashboardCharts
                buckets={buckets}
                period={period}
                materialSplit={materialSplit}
                weightUnit={settings.Formats.WeightUnit}
            />
            <RecentTicketsCard rows={rows} />
        </div>
    );
};
