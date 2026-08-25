import type { ReportDefinition } from "@db/reportDefs";

import { datePresetRange } from "./reportDatePresets";
import type { Translate } from "../reportRows";

/** Every built-in preset's `Id` starts with this — the one thing that tells
 * a `ReportDefinition` apart from an operator's own saved view, since
 * built-ins are never written to the db (db/reportDefs.ts has no `Builtin`
 * flag) and only ever exist as objects `builtinReportDefs` fabricates fresh
 * on each render. An operator-typed name can never collide with this: saved
 * views get their `Id` from `addReportDef`'s db-generated id, never from
 * user input. */
const BUILTIN_ID_PREFIX = "builtin:";

export const isBuiltinReportId = (id: string): boolean => id.startsWith(BUILTIN_ID_PREFIX);

/**
 * Task: "to solve few of the issue we might need to create some default
 * filters / 1 daily, weekly, monthly, waiting for second wait, ... ticnk of
 * more and implement them they cant be edited or deleted" — a handful of
 * always-available saved views, listed ahead of the operator's own saved
 * reports in SavedReportsRow's dropdown. Unlike a real saved report, their
 * `DateFrom`/`DateTo` aren't a fixed range frozen at save time — "Daily" a
 * week from now must still mean *that* day, not the day this was written —
 * so every one of them is recomputed from `datePresetRange` on every call
 * instead of ever being persisted. Recalling one behaves exactly like
 * recalling a saved report (`useSavedReportActions`'s `handleRecallReport`
 * doesn't care where a `ReportDefinition` came from); the only difference is
 * SavedReportsRow hides the edit/delete actions for any `Id` `isBuiltinReportId`
 * accepts, matching "they cant be edited or deleted".
 *
 * Task: "We dont want all series as a defult for all these case it should
 * be only on the current series, do it all the places" — every preset here
 * carries `SeriesEpoch: "current"` (db/reportDefs.ts,
 * useSavedReportActions.ts's `applyRecalledReport`) so recalling one always
 * scopes to the active numbering series, matching the header's own
 * current-series-scoped waiting-count badge (useReportsScreenData.ts) —
 * "backed" tickets from a prior "Reset the counter now" stay excluded by
 * default everywhere, presets included.
 */
export const builtinReportDefs = (t: Translate): ReportDefinition[] => {
    const daily = datePresetRange("today");
    const weekly = datePresetRange("week");
    const monthly = datePresetRange("month");
    return [
        {
            Id: `${BUILTIN_ID_PREFIX}daily`,
            Name: t("reports.presets.daily"),
            View: "tickets",
            GroupBy: "material",
            Filter: "all",
            DateFrom: daily.from,
            DateTo: daily.to,
            SeriesEpoch: "current",
        },
        {
            Id: `${BUILTIN_ID_PREFIX}weekly`,
            Name: t("reports.presets.weekly"),
            View: "tickets",
            GroupBy: "material",
            Filter: "all",
            DateFrom: weekly.from,
            DateTo: weekly.to,
            SeriesEpoch: "current",
        },
        {
            Id: `${BUILTIN_ID_PREFIX}monthly`,
            Name: t("reports.presets.monthly"),
            View: "tickets",
            GroupBy: "material",
            Filter: "all",
            DateFrom: monthly.from,
            DateTo: monthly.to,
            SeriesEpoch: "current",
        },
        {
            // No date bounds — "waiting for a second weight" means every
            // still-open ticket in the current series, the same all-time
            // (but current-series) scope as the header's own waiting chip
            // (useReportsScreenController.ts's `showWaiting`), not just
            // today/this week/this month.
            Id: `${BUILTIN_ID_PREFIX}waiting`,
            Name: t("reports.presets.waiting"),
            View: "tickets",
            GroupBy: "material",
            Filter: "half",
            SeriesEpoch: "current",
        },
    ];
};
