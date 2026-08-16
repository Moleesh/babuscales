import { formatMoney } from "@constants/numberFormat";
import type { DocRow } from "@db/types";

import { buildTicketRows, summarizeTicketRows } from "./reportRows";

// The "scheduled daily summary" bullet, ported as one
// plain-text e-mail rather than a PDF/report attachment: no PDF export
// engine exists yet (app/README.md known gap), and a message body is
// something every mail client can already render, so there's nothing to
// build past what @engines/email already sends. Deliberately not exported
// from this feature's barrel (index.ts) — imported by direct subpath from
// both App.tsx and settings/_private/SystemPane.tsx, the same "avoid a
// reports↔settings barrel cycle" reasoning SystemPane.tsx's own comment
// gives for importing @features/licensing the same way.

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Local (not UTC) yyyy-MM-dd — a business day is whatever the clock on this machine says it is, same as every other "today" comparison in this app (dashboardData.ts's own isSameDay, reportRows.ts's `at`). */
export const todayLocalDate = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

/** Local HH:MM, zero-padded — sorts and compares correctly as a plain string against Settings' 24-hour `DailySummary.Time` field, so the caller never needs to parse either side into a Date. */
export const nowLocalHm = (): string => {
    const now = new Date();
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
};

/**
 * True once a whole scheduled day has been skipped outright — not just
 * "today's `Time` hasn't come up yet." Now mostly a fallback: the real fix
 * for a site whose hours never straddle `DailySummary.Time` is
 * `App.tsx`'s `DailySummaryTaskSync`, a genuine Windows Task Scheduler
 * entry that wakes the app headlessly right at `Time` regardless of
 * whether it's open (`@engines/scheduler`,
 * `src-tauri/src/commands/scheduler.rs`). This function still backstops
 * the cases that don't reach: the OS task disabled, a non-Windows dev
 * build, or the machine having been fully off across the scheduled moment
 * — `App.tsx`'s in-app `checkDue` waits on `nowLocalHm() >= cfg.Time`,
 * which never becomes true on its own once the app was closed at that
 * exact time, so once the gap is this wide it sends on the very next
 * launch regardless of the clock — a late summary beats a silently
 * skipped one.
 */
export const isMoreThanOneDayLate = (lastSentDate: string | null, today: string): boolean => {
    if (!lastSentDate) return false;
    const gapMs = Date.parse(today) - Date.parse(lastSentDate);
    const gapDays = gapMs / (24 * 60 * 60 * 1000);
    return gapDays > 1;
};

export interface DailySummaryEmail {
    subject: string;
    body: string;
}

/**
 * One day's worth of `reportRows.ts` data, formatted as a message body — the
 * same three Dashboard KPIs (tickets, net tonnes, charge collected) plus a
 * by-material breakdown (`summarizeTicketRows`), not a fourth reimplementation
 * of the totals `dashboardData.ts` already computes for the on-screen KPI
 * cards (this file deliberately doesn't import that module — see the header
 * comment above on why).
 */
export const buildDailySummaryEmail = (
    docs: DocRow[],
    dateIso: string,
    amountDp: 0 | 2,
): DailySummaryEmail => {
    const today = buildTicketRows(docs).filter((row) => row.at.slice(0, 10) === dateIso);
    const active = today.filter((row) => !row.isCancelled);
    const completed = active.filter((row) => row.netKg !== null);
    const netTonnes = completed.reduce((sum, row) => sum + (row.netKg ?? 0), 0) / 1000;
    const chargeTotal = completed.reduce((sum, row) => sum + (row.charge ?? 0), 0);
    const byMaterial = summarizeTicketRows(active, "material");

    const subject = `BabuScales daily summary — ${dateIso}`;
    const lines = [
        subject,
        "",
        `Tickets: ${active.length}`,
        `Net weighed: ${netTonnes.toFixed(2)} t`,
        `Charge collected: ${formatMoney(chargeTotal, amountDp)}`,
        "",
        byMaterial.length ? "By material:" : "No completed tickets today.",
        ...byMaterial.map(
            (row) =>
                `  ${row.key} — ${row.ticketCount} ticket${row.ticketCount === 1 ? "" : "s"}, ` +
                `${row.netTonnes.toFixed(2)} t, ${formatMoney(row.charge, amountDp)}`,
        ),
    ];

    return { subject, body: lines.join("\n") };
};
