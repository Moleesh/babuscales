import { z } from "zod";

// PLAN §22 Phase 7 — "legacy v1/v2 import": a one-time tool for a site
// moving off VaultBill (the older desktop products this plan calls v1/v2,
// PLAN §4/§6/§12 throughout) onto BabuScales. VaultBill's real v1/v2
// database (an `update.sql`-patched, ad-hoc-column SQLite/Access file,
// PLAN §6 line 222) isn't available to this codebase to read natively —
// there is no v1/v2 source tree here to introspect. What's honest to build
// instead is this documented JSON interchange format: a site converts its
// outgoing data into a bundle shaped like this (by hand for a small site,
// or with a short one-off script for a large one), and this tool takes it
// from there — validating, previewing and committing through the exact
// same `DataPort.saveMaster`/`saveDoc` calls every other feature uses, with
// nothing bypassed and nothing assumed about how the old data got here.
//
// Deliberately one JSON file, not nine CSVs (one per master kind, PLAN
// §9.1, plus tickets) — `Masters` bulk import/export at real scale is
// already its own tracked gap (MastersScreen.tsx's own comment); building
// eight separate ad-hoc CSV importers here would both duplicate that future
// work and be a worse experience than one file a migration script can emit
// in a single pass.

export const LEGACY_BUNDLE_VERSION = 1;

const nameEntry = z.object({
    Name: z.string().min(1),
    Notes: z.string().optional(),
});

const partyEntry = nameEntry.extend({
    Email: z.string().optional(),
    Phone: z.string().optional(),
});

const materialEntry = nameEntry.extend({
    Rate: z.number().optional(),
});

const storedTareEntry = z.object({
    VehicleNo: z.string().min(1),
    WeightKg: z.number(),
    CapturedAt: z.string().min(1),
    PartyName: z.string().optional(),
});

// `LegacyId` is required and is the whole of this tool's idempotency story
// for tickets (see legacyImportPlan.ts) — re-running the same bundle, or a
// bundle with some rows already imported, must never create duplicate
// tickets. It travels into the new ticket's own Body as `ImportRef`
// (TicketBody's `.passthrough()`, db/ticketBody.ts) so a later re-import,
// even from a different machine sharing the same restored data, still sees
// it. A masters row has no such stable id in the old system, so those dedupe
// on name instead (documented on planLegacyImport) — good enough at
// migration-time scale, not claimed to be a general merge tool.
const ticketEntry = z.object({
    LegacyId: z.string().min(1),
    VehicleNo: z.string().optional(),
    Party: z.string().optional(),
    Material: z.string().optional(),
    Transporter: z.string().optional(),
    ChallanNo: z.string().optional(),
    Operator: z.string().optional(),
    TareKg: z.number().int().optional(),
    TareAt: z.string().optional(),
    GrossKg: z.number().int().optional(),
    GrossAt: z.string().optional(),
});

export const legacyImportBundleSchema = z.object({
    BundleVersion: z.literal(LEGACY_BUNDLE_VERSION),
    /** Free text, kept only for the record — e.g. "VaultBill v2, site X, exported 2026-01-15". Not machine-read. */
    Source: z.string().optional(),
    Parties: z.array(partyEntry).optional(),
    Materials: z.array(materialEntry).optional(),
    Vehicles: z.array(nameEntry).optional(),
    VehicleTypes: z.array(nameEntry).optional(),
    Transporters: z.array(nameEntry).optional(),
    Places: z.array(nameEntry).optional(),
    Operators: z.array(nameEntry).optional(),
    StoredTares: z.array(storedTareEntry).optional(),
    Tickets: z.array(ticketEntry).optional(),
});

export type LegacyImportBundle = z.infer<typeof legacyImportBundleSchema>;
export type LegacyNameEntry = z.infer<typeof nameEntry>;
export type LegacyPartyEntry = z.infer<typeof partyEntry>;
export type LegacyMaterialEntry = z.infer<typeof materialEntry>;
export type LegacyStoredTareEntry = z.infer<typeof storedTareEntry>;
export type LegacyTicketEntry = z.infer<typeof ticketEntry>;

/** Parses raw JSON (already `JSON.parse`d) into a validated bundle, or throws a zod error the caller renders as-is — same "typo reported back, not silently swallowed" honesty as the licence-code paste (docs/AdminSetup.md §2). */
export const parseLegacyBundle = (raw: unknown): LegacyImportBundle =>
    legacyImportBundleSchema.parse(raw);
