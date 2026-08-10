import type { DataPort } from "@db/DataPort";
import { MASTER_KINDS } from "@db/types";
import type { MasterKind } from "@db/types";
import type { LegacyExistingState, LegacyImportPlan } from "@engines/importEngine/legacyImportPlan";

// The IO half of the legacy-import card — everything above this file
// (legacyImportBundle.ts's parsing, legacyImportPlan.ts's planning) is pure
// and DataPort-free, matching every other engine. This is feature code, not
// an engine, precisely because it talks to DataPort directly; kept in its
// own file so LegacyImportCard.tsx stays render-and-state, not orchestration
// (the same split BackupRestoreCard/DailySummaryCard use for their own
// async handlers, just large enough here to earn its own module).

/** One read per master kind plus the ticket list, so `planLegacyImport` never guesses at what's already here — matching-by-name only works if "already here" is a fresh read, not a stale cache. */
export const loadExistingState = async (db: DataPort): Promise<LegacyExistingState> => {
    const masterNamesByKind: Partial<Record<MasterKind, Set<string>>> = {};
    await Promise.all(
        MASTER_KINDS.map(async (kind) => {
            const rows = await db.listMasters({ MasterKind: kind });
            masterNamesByKind[kind] = new Set(rows.map((row) => row.Name.trim().toLowerCase()));
        }),
    );
    const tickets = await db.listDocs({ DocKind: "Ticket" });
    const ticketLegacyIds = new Set(
        tickets
            .map((doc) => doc.Body.ImportRef)
            .filter((ref): ref is string => typeof ref === "string"),
    );
    return { masterNamesByKind, ticketLegacyIds };
};

export interface LegacyImportRunResult {
    masterCreated: number;
    ticketCreated: number;
    failed: { label: string; message: string }[];
}

/**
 * Applies a plan one draft at a time (not `Promise.all`) — a memory or
 * SQLite write per row is cheap, and sequential writes mean a failure
 * partway through leaves a clean, countable boundary ("created 40 of 61,
 * here's what failed") instead of an unordered pile of settled/rejected
 * promises. Masters commit before tickets so a ticket's Party/Material/
 * Vehicle strings resolve against a master that already exists the moment
 * the import finishes, even though nothing here enforces that as a foreign
 * key (TicketBody stores names, not master ids — db/ticketBody.ts).
 */
export const commitLegacyImport = async (
    db: DataPort,
    plan: LegacyImportPlan,
): Promise<LegacyImportRunResult> => {
    const failed: { label: string; message: string }[] = [];
    let masterCreated = 0;
    for (const { draft } of plan.masterDrafts) {
        try {
            await db.saveMaster(draft);
            masterCreated++;
        } catch (err) {
            failed.push({
                label: `${draft.MasterKind} "${draft.Name}"`,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    let ticketCreated = 0;
    for (const { legacyId, draft } of plan.ticketDrafts) {
        try {
            await db.saveDoc(draft);
            ticketCreated++;
        } catch (err) {
            failed.push({
                label: `Ticket ${legacyId}`,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    return { masterCreated, ticketCreated, failed };
};
