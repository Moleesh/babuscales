import type { DataPort } from "@db/DataPort";

const MIGRATION_PAGE_SIZE = 200;

// Guards against running the same DataPort instance through this migration
// twice in one app session — React StrictMode double-invokes effects in dev,
// and useSettingsRecord's own mount effect (this migration's one caller)
// re-fires whenever `db` itself changes identity. The migration is
// idempotent either way (a second pass just finds nothing left to rewrite),
// this only saves the redundant listMasters/listDocs sweep.
const migratedDbs = new WeakSet<DataPort>();

// Ultra-review finding: the money/weight decimal migration (item #5,
// commit 7e63a9a) tightened `Material.Body.Rate`/`Ticket.Body.Charge` to
// decimal-string-only — `getMaterialRate` (materialBody.ts) now silently
// `null`s any Rate that isn't a string, and `ticketBody.ts`'s Zod schema
// now *throws* on a Charge that isn't one. Neither ever ran for a row
// written by a pre-migration build, where both were plain JSON numbers.
// Rather than loosen those schemas back to accepting numbers (which would
// let a fresh legacy-shaped value slip back in going forward), this walks
// every Material/Ticket row once and rewrites a numeric Rate/Charge to its
// decimal-string form in place. Idempotent — a row with no numeric field,
// or one already migrated, is read and left untouched, never re-saved.
//
// Run fire-and-forget from useSettingsRecord's own load effect:
// SettingsProvider mounts near App.tsx's root, so this runs once per app
// start, before Reports/Weighing/Masters would otherwise hit the
// throwing/silently-null read paths on first contact with legacy data.
// Silent by design — this repairs data the operator never directly
// caused and has no reason to be told about.
export const migrateLegacyDecimalFields = async (db: DataPort): Promise<void> => {
    if (migratedDbs.has(db)) return;
    migratedDbs.add(db);
    await migrateMaterialRates(db);
    await migrateTicketCharges(db);
};

const migrateMaterialRates = async (db: DataPort): Promise<void> => {
    let after: { Name: string; MasterId: string } | undefined;
    for (;;) {
        const page = await db.listMasters({
            MasterKind: "Material",
            Limit: MIGRATION_PAGE_SIZE,
            ...(after ? { After: after } : {}),
        });
        if (page.length === 0) return;
        for (const row of page) {
            const rate = row.Body.Rate;
            if (typeof rate === "number") {
                await db.saveMaster({
                    MasterId: row.MasterId,
                    MasterKind: row.MasterKind,
                    Name: row.Name,
                    IsActive: row.IsActive,
                    Body: { ...row.Body, Rate: String(rate) },
                });
            }
        }
        if (page.length < MIGRATION_PAGE_SIZE) return;
        const last = page[page.length - 1];
        if (!last) return;
        after = { Name: last.Name, MasterId: last.MasterId };
    }
};

const migrateTicketCharges = async (db: DataPort): Promise<void> => {
    let after: { CreatedAt: string; DocId: string } | undefined;
    for (;;) {
        const page = await db.listDocs({
            DocKind: "Ticket",
            Limit: MIGRATION_PAGE_SIZE,
            ...(after ? { After: after } : {}),
        });
        if (page.length === 0) return;
        for (const row of page) {
            const charge = row.Body.Charge;
            if (typeof charge === "number") {
                await db.saveDoc({
                    DocId: row.DocId,
                    DocKind: row.DocKind,
                    IsCancelled: row.IsCancelled,
                    Body: { ...row.Body, Charge: String(charge) },
                });
            }
        }
        if (page.length < MIGRATION_PAGE_SIZE) return;
        const last = page[page.length - 1];
        if (!last) return;
        after = { CreatedAt: last.CreatedAt, DocId: last.DocId };
    }
};
