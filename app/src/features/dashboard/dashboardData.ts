import type { TicketRow } from "@features/reports";

// A weighbridge's business day, not a calendar one — no site-hours Setting
// exists yet (app/README.md known gap), so "day" buckets fix a reasonable
// window rather than showing 24 mostly-empty hours.
const OPERATING_HOURS = { start: 6, end: 20 } as const;

export const isSameDay = (iso: string, referenceIso: string): boolean =>
    iso.slice(0, 10) === referenceIso.slice(0, 10);

// "Can we have a drop down to specify if its per day, month,
// week, year, all... change all the column based on that also... this also
// includes ticket by hour." One period, driving the KPI strip, the material
// split and the activity chart together — `day` keeps the original
// hour-of-day chart, everything wider re-buckets by a coarser unit (see
// `computeActivityBuckets`) since "tickets by hour" stops being a
// meaningful axis once the window is a month or a year.
export const DASHBOARD_PERIODS = ["day", "week", "month", "year", "all"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

const startOfWeek = (date: Date): Date => {
    const clone = new Date(date);
    clone.setHours(0, 0, 0, 0);
    const mondayOffset = (clone.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat → 0=Mon..6=Sun
    clone.setDate(clone.getDate() - mondayOffset);
    return clone;
};

export const isInPeriod = (iso: string, referenceIso: string, period: DashboardPeriod): boolean => {
    if (period === "all") return true;
    const date = new Date(iso);
    const ref = new Date(referenceIso);
    if (period === "day") return isSameDay(iso, referenceIso);
    if (period === "week") return startOfWeek(date).getTime() === startOfWeek(ref).getTime();
    if (period === "month")
        return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
    return date.getFullYear() === ref.getFullYear(); // "year"
};

export interface HourBucket {
    hour: number;
    count: number;
}

/** "Tickets by hour" — real counts from today's rows, not the mock's fixed demo curve. */
export const hourlyTicketCounts = (rows: TicketRow[], referenceIso: string): HourBucket[] => {
    const buckets = new Map<number, number>();
    for (let hour = OPERATING_HOURS.start; hour <= OPERATING_HOURS.end; hour++)
        buckets.set(hour, 0);
    for (const row of rows) {
        if (!isSameDay(row.at, referenceIso)) continue;
        const hour = new Date(row.at).getHours();
        if (hour < OPERATING_HOURS.start || hour > OPERATING_HOURS.end) continue;
        buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour);
};

export interface ActivityBucket {
    /** Stable identity for the bar's `key` prop and the "is this the current bucket" highlight. */
    id: string;
    /** Short axis label — "09" (hour), "Mon" (weekday), "12" (day-of-month), "Jan" (month), or a year. */
    label: string;
    count: number;
    current: boolean;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const dayBuckets = (rows: TicketRow[], referenceIso: string): ActivityBucket[] => {
    const currentHour = new Date(referenceIso).getHours();
    return hourlyTicketCounts(rows, referenceIso).map((bucket) => ({
        id: String(bucket.hour),
        label: String(bucket.hour).padStart(2, "0"),
        count: bucket.count,
        current: bucket.hour === currentHour,
    }));
};

const weekBuckets = (scoped: TicketRow[], ref: Date): ActivityBucket[] => {
    const counts = new Array(7).fill(0) as number[];
    for (const row of scoped) {
        const idx = (new Date(row.at).getDay() + 6) % 7;
        counts[idx] = (counts[idx] ?? 0) + 1;
    }
    const currentIdx = (ref.getDay() + 6) % 7;
    return WEEKDAY_LABELS.map((label, i) => ({
        id: label,
        label,
        count: counts[i] ?? 0,
        current: i === currentIdx,
    }));
};

const monthBuckets = (scoped: TicketRow[], ref: Date): ActivityBucket[] => {
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const counts = new Array(daysInMonth).fill(0) as number[];
    for (const row of scoped) {
        const idx = new Date(row.at).getDate() - 1;
        counts[idx] = (counts[idx] ?? 0) + 1;
    }
    return counts.map((count, i) => ({
        id: String(i + 1),
        label: String(i + 1),
        count: count ?? 0,
        current: i + 1 === ref.getDate(),
    }));
};

const yearBuckets = (scoped: TicketRow[], ref: Date): ActivityBucket[] => {
    const counts = new Array(12).fill(0) as number[];
    for (const row of scoped) {
        const idx = new Date(row.at).getMonth();
        counts[idx] = (counts[idx] ?? 0) + 1;
    }
    return MONTH_LABELS.map((label, i) => ({
        id: label,
        label,
        count: counts[i] ?? 0,
        current: i === ref.getMonth(),
    }));
};

// "all" — one bucket per calendar year seen in the data, oldest first.
const allBuckets = (scoped: TicketRow[], ref: Date): ActivityBucket[] => {
    const counts = new Map<number, number>();
    for (const row of scoped) {
        const year = new Date(row.at).getFullYear();
        counts.set(year, (counts.get(year) ?? 0) + 1);
    }
    const years = Array.from(counts.keys()).sort((a, b) => a - b);
    return years.map((year) => ({
        id: String(year),
        label: String(year),
        count: counts.get(year) ?? 0,
        current: year === ref.getFullYear(),
    }));
};

/** The period-aware generalization of `hourlyTicketCounts` — "day" reuses
 * the exact same hour buckets (and their own `currentHour` highlight
 * elsewhere), everything wider re-buckets by weekday/day-of-month/month/year.
 * Split out of a single big function (over the line budget — docs/CodingStandards.md)
 * into one helper per period. */
export const computeActivityBuckets = (
    rows: TicketRow[],
    referenceIso: string,
    period: DashboardPeriod,
): ActivityBucket[] => {
    if (period === "day") return dayBuckets(rows, referenceIso);

    const scoped = rows.filter((row) => !row.isCancelled && isInPeriod(row.at, referenceIso, period));
    const ref = new Date(referenceIso);

    if (period === "week") return weekBuckets(scoped, ref);
    if (period === "month") return monthBuckets(scoped, ref);
    if (period === "year") return yearBuckets(scoped, ref);
    return allBuckets(scoped, ref);
};

export interface DashboardKpis {
    ticketsToday: number;
    netTonnesToday: number;
    /** Parked, one-weight tickets. Counted across all days, not just today —
     * an open ticket from yesterday is still waiting — but, per task "We
     * dont want all series as a defult for all these case it should be
     * only on the current series, do it all the places", scoped to the
     * active numbering series the same as every other figure here: a
     * ticket "backed" by a prior "Reset the counter now" no longer counts
     * as waiting on the current shift. */
    waitingCount: number;
    avgNetKgPerTicket: number;
    /** The mock's "Charge collected" KPI — real now (engines/billing), though still the flat per-ticket rate, not a per-vehicle-type/material one. */
    chargeToday: number;
}

/** Task: "hope dashboar is using the current instease data not from backed
 * up records" — `rows` must already be scoped to the active numbering
 * series (`Numbering.CurrentEpoch`, filtered by the caller via
 * `filterRowsBySeries`, matching Reports' own default view). Tickets from a
 * prior "Reset the counter now" generation ("backed" data — settingsSchema.ts's
 * own `CurrentEpoch` doc comment) never pad any figure below, `waitingCount`
 * included (task: "do it all the places" — current-series is the default
 * everywhere, not just tonnage/throughput). */
export const computeDashboardKpis = (
    rows: TicketRow[],
    referenceIso: string,
    period: DashboardPeriod = "day",
): DashboardKpis => {
    const today = rows.filter((row) => !row.isCancelled && isInPeriod(row.at, referenceIso, period));
    const completedToday = today.filter((row) => row.netKg !== null);
    const netTonnesToday = completedToday.reduce((sum, row) => sum + (row.netKg ?? 0), 0) / 1000;
    return {
        ticketsToday: today.length,
        netTonnesToday,
        waitingCount: rows.filter((row) => row.isOpen).length,
        avgNetKgPerTicket: completedToday.length
            ? (netTonnesToday * 1000) / completedToday.length
            : 0,
        chargeToday: completedToday.reduce((sum, row) => sum + (row.charge ?? 0), 0),
    };
};

export interface MaterialSplitEntry {
    material: string;
    tonnes: number;
    share: number;
    /** How many completed tickets fed this material's tonnage — a load
     * count on both charts, shown next to each row's
     * weight so a heavy-but-rare material reads differently from a
     * light-but-frequent one. */
    count: number;
}

// "Where the tonnage is coming from" — the selected period's
// completed tickets, grouped by Material and sorted heaviest-first, capped
// to `limit` entries so the card doesn't grow unbounded on a busy
// month/year with many materials.
export const computeMaterialSplit = (
    rows: TicketRow[],
    referenceIso: string,
    limit: number,
    period: DashboardPeriod = "day",
): MaterialSplitEntry[] => {
    const today = rows.filter(
        (row) => !row.isCancelled && row.netKg !== null && isInPeriod(row.at, referenceIso, period),
    );
    const totals = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const row of today) {
        const key = row.material || "—";
        totals.set(key, (totals.get(key) ?? 0) + (row.netKg ?? 0) / 1000);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const totalTonnes = Array.from(totals.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(totals.entries())
        .map(([material, tonnes]) => ({
            material,
            tonnes,
            share: tonnes / totalTonnes,
            count: counts.get(material) ?? 0,
        }))
        .sort((a, b) => b.tonnes - a.tonnes)
        .slice(0, limit);
};
