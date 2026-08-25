import { z } from "zod";

import type { DataPort } from "./DataPort";
import { newId } from "./id";

// Task #54 — saved report definitions. One row, one ConfigId (mirrors
// schema.ts's TICKET_SCHEMA_CONFIG_ID exactly), holding the whole named
// list rather than one row per definition — there's no per-definition
// query this app needs (no "get definition by id" screen), just "load
// the list, show it, let the operator recall or delete one."
//
// Deliberately scoped down from a fuller "visual query builder
// over the dynamic schema" — schema-driven field *rendering* was left
// unbuilt (custom FieldIds validate and save but never reach the ticket
// form or ticket data — see FieldsLanguagePane.tsx's own comment), so
// there is no dynamic field data anywhere in this app to group or filter
// by beyond what reportRows.ts's GroupKey/TicketRowFilter already cover.
// The reference mock never built a query builder either (its own
// `#rGroup` select is the same four-option static list this app has).
// What's real here: naming and recalling a (View, GroupBy, Filter)
// combination — genuinely useful, and an honest match for what "custom
// report indexes" can mean without a dynamic schema underneath it.
//
// `View`/`GroupBy`/`Filter` are plain strings, not `ReportView`/
// `GroupKey`/`TicketRowFilter` from features/reports/reportRows.ts —
// `db/` doesn't import from `features/` (PLAN's layering rule, "Layer
// cycles: none"); ReportsScreen.tsx does the narrowing back to those
// union types on load, the same way it already narrows `<select>` values.
const REPORT_DEFS_CONFIG_ID = "report-defs-Ticket";

export interface ReportDefinition {
    Id: string;
    Name: string;
    View: string;
    GroupBy: string;
    Filter: string;
    /** Report-builder wizard MVP — date range
     * (`yyyy-MM-dd`, matching reportRows.ts's own date-only filter) and a
     * comma-joined list of visible ticket-column keys. Both optional so
     * pre-existing saved defs (View/GroupBy/Filter only) still round-trip
     * through `loadReportDefs` unchanged — an absent value just means
     * "no date range" / "all columns" on recall. */
    DateFrom?: string;
    DateTo?: string;
    Columns?: string;
}

const reportDefinitionSchema: z.ZodType<ReportDefinition> = z.object({
    Id: z.string().min(1),
    Name: z.string().min(1),
    View: z.string().min(1),
    GroupBy: z.string().min(1),
    Filter: z.string().min(1),
    DateFrom: z.string().optional(),
    DateTo: z.string().optional(),
    Columns: z.string().optional(),
});

const reportDefsBodySchema = z.object({ Definitions: z.array(reportDefinitionSchema) });

/** Falls back to an empty list if nothing was ever saved, or if the saved row fails validation — same "don't crash, just start empty" shape as `loadTicketSchema`'s own fallback. */
export const loadReportDefs = async (db: DataPort): Promise<ReportDefinition[]> => {
    const row = await db.getConfig(REPORT_DEFS_CONFIG_ID);
    if (!row) return [];
    const parsed = reportDefsBodySchema.safeParse(row.Body);
    return parsed.success ? parsed.data.Definitions : [];
};

const saveAll = (db: DataPort, definitions: ReportDefinition[]): Promise<void> =>
    db
        .saveConfig({
            ConfigId: REPORT_DEFS_CONFIG_ID,
            ConfigKind: "Preset",
            Body: { Definitions: definitions },
        })
        .then(() => undefined);

// add/delete/rename are all read-all -> mutate -> write-all against the
// *same* single row (REPORT_DEFS_CONFIG_ID), so two overlapping calls (e.g.
// a delete and a rename fired back to back from the UI) can otherwise
// interleave their reads and have the second write silently clobber the
// first. This module-level chain serializes every call through this file
// so each one's `loadReportDefs` read only ever starts after the previous
// call's `saveAll` has finished — one queue, not a real DB lock, but
// sufficient since this whole adapter is single-process/single-tab.
let pending: Promise<unknown> = Promise.resolve();
const withLock = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = pending.then(fn, fn);
    // Swallow so one failed call doesn't poison the queue for later,
    // unrelated calls — each call's own rejection still propagates to its
    // caller via `next`.
    pending = next.catch(() => undefined);
    return next;
};

/** Appends a new named definition and persists the whole list — returns the new row's `Id` so the caller can select it immediately without a second read. */
export const addReportDef = (
    db: DataPort,
    def: Omit<ReportDefinition, "Id">,
): Promise<string> =>
    withLock(async () => {
        const existing = await loadReportDefs(db);
        const id = newId();
        await saveAll(db, [...existing, { ...def, Id: id }]);
        return id;
    });

export const deleteReportDef = (db: DataPort, id: string): Promise<void> =>
    withLock(async () => {
        const existing = await loadReportDefs(db);
        await saveAll(
            db,
            existing.filter((def) => def.Id !== id),
        );
    });

/** Task: "edit save report should open the create report in edit form" —
 * overwrites everything about a saved definition (View/GroupBy/Filter/dates/
 * columns/name) in place, keeping its `Id`. The report-builder modal's Save
 * button when opened via a saved view's edit (pencil) action, as opposed to
 * `addReportDef` (a fresh save from scratch) or `renameReportDef` (name
 * only, still used nowhere now that edit opens the full builder instead of
 * an inline rename box). */
export const updateReportDef = (db: DataPort, id: string, def: Omit<ReportDefinition, "Id">): Promise<void> =>
    withLock(async () => {
        const existing = await loadReportDefs(db);
        await saveAll(
            db,
            existing.map((row) => (row.Id === id ? { ...def, Id: id } : row)),
        );
    });

/** Renames a saved report definition in place — everything else about it
 * (View/GroupBy/Filter/dates/columns) is untouched. The saved-views dropdown's
 * own edit (pencil) action, so an operator can fix a typo'd name without
 * deleting and re-saving the whole definition. */
export const renameReportDef = (db: DataPort, id: string, name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return Promise.resolve();
    return withLock(async () => {
        const existing = await loadReportDefs(db);
        await saveAll(
            db,
            existing.map((def) => (def.Id === id ? { ...def, Name: trimmed } : def)),
        );
    });
};
