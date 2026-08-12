export type DatePresetKey = "today" | "month" | "year" | "all";

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Report-builder wizard MVP (task: Reports rework, item 4) quick presets —
 * also what Dashboard's own period concept means by "today"/"this month"/
 * "this year" (App.tsx's `onNavigateToReports` intent, wired the same way
 * the existing "waiting" intent is). "all" clears both bounds, matching
 * `filterRowsByDateRange`'s own "empty means no limit" contract.
 */
export const datePresetRange = (preset: DatePresetKey): { from: string; to: string } => {
    const now = new Date();
    const today = toDateOnly(now);
    if (preset === "today") return { from: today, to: today };
    if (preset === "month") {
        return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    }
    if (preset === "year") {
        return { from: toDateOnly(new Date(now.getFullYear(), 0, 1)), to: today };
    }
    return { from: "", to: "" };
};
