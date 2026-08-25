export type DatePresetKey = "today" | "week" | "month" | "year" | "all";

// Local calendar date, not UTC — `date` here is always already a local
// `Date` (either `new Date()` or `new Date(year, month, day)`), so reading
// it back with `.toISOString()` would re-express it in UTC and could shift
// the day for any positive UTC offset (e.g. IST, UTC+5:30). Use the local
// getters instead, matching reportRows.ts's `toLocalDateOnly`.
const toDateOnly = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Report-builder wizard MVP quick presets —
 * also what Dashboard's own period concept means by "today"/"this month"/
 * "this year" (App.tsx's `onNavigateToReports` intent, wired the same way
 * the existing "waiting" intent is). "all" clears both bounds, matching
 * `filterRowsByDateRange`'s own "empty means no limit" contract.
 */
export const datePresetRange = (preset: DatePresetKey): { from: string; to: string } => {
    const now = new Date();
    const today = toDateOnly(now);
    if (preset === "today") return { from: today, to: today };
    if (preset === "week") {
        // Last 7 calendar days inclusive of today — a rolling window, not
        // "this Mon–Sun", since the built-in "Weekly" preset (builtinReportDefs.ts)
        // is meant to answer "what came in over the last week" at any point
        // mid-week, not just once a calendar week closes.
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        return { from: toDateOnly(start), to: today };
    }
    if (preset === "month") {
        return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    }
    if (preset === "year") {
        return { from: toDateOnly(new Date(now.getFullYear(), 0, 1)), to: today };
    }
    return { from: "", to: "" };
};
