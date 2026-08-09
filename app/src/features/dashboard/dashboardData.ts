import type { TicketRow } from "@features/reports";

// A weighbridge's business day, not a calendar one — no site-hours Setting
// exists yet (app/README.md known gap), so this fixes a reasonable window
// rather than showing 24 mostly-empty hours.
const OPERATING_HOURS = { start: 6, end: 20 } as const;

export const isSameDay = (iso: string, referenceIso: string): boolean =>
    iso.slice(0, 10) === referenceIso.slice(0, 10);

export interface HourBucket {
    hour: number;
    count: number;
}

/** PLAN §18 "Tickets by hour" — real counts from today's rows, not the mock's fixed demo curve. */
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

export interface DashboardKpis {
    ticketsToday: number;
    netTonnesToday: number;
    /** PLAN §7.5 — parked, one-weight tickets. Counted across all days, not just today: an open ticket from yesterday is still waiting. */
    waitingCount: number;
    avgNetKgPerTicket: number;
}

/** No billing/rate engine yet (app/README.md known gap) — "Charge collected" from the mock's KPI row is left out rather than shown as a fabricated number. */
export const computeDashboardKpis = (rows: TicketRow[], referenceIso: string): DashboardKpis => {
    const today = rows.filter((row) => !row.isCancelled && isSameDay(row.at, referenceIso));
    const completedToday = today.filter((row) => row.netKg !== null);
    const netTonnesToday = completedToday.reduce((sum, row) => sum + (row.netKg ?? 0), 0) / 1000;
    return {
        ticketsToday: today.length,
        netTonnesToday,
        waitingCount: rows.filter((row) => row.isOpen).length,
        avgNetKgPerTicket: completedToday.length
            ? (netTonnesToday * 1000) / completedToday.length
            : 0,
    };
};
