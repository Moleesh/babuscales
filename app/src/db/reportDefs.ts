import { z } from "zod";

import type { DataPort } from "./DataPort";
import { newId } from "./id";

// Task #54 — saved report definitions. One row, one ConfigId (mirrors
// schema.ts's TICKET_SCHEMA_CONFIG_ID exactly), holding the whole named
// list rather than one row per definition — there's no per-definition
// query this app needs (no "get definition by id" screen), just "load
// the list, show it, let the operator recall or delete one."
//
// Deliberately scoped down from PLAN §18's fuller "visual query builder
// over the dynamic schema": task #50 left schema-driven field *rendering*
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
}

const reportDefinitionSchema: z.ZodType<ReportDefinition> = z.object({
    Id: z.string().min(1),
    Name: z.string().min(1),
    View: z.string().min(1),
    GroupBy: z.string().min(1),
    Filter: z.string().min(1),
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

/** Appends a new named definition and persists the whole list — returns the new row's `Id` so the caller can select it immediately without a second read. */
export const addReportDef = async (
    db: DataPort,
    def: Omit<ReportDefinition, "Id">,
): Promise<string> => {
    const existing = await loadReportDefs(db);
    const id = newId();
    await saveAll(db, [...existing, { ...def, Id: id }]);
    return id;
};

export const deleteReportDef = async (db: DataPort, id: string): Promise<void> => {
    const existing = await loadReportDefs(db);
    await saveAll(
        db,
        existing.filter((def) => def.Id !== id),
    );
};
