import { newId } from "@db/id";
import type { Capture } from "@db/ticketBody";
import type { DocDraft, JsonRecord, MasterDraft, MasterKind } from "@db/types";

import type {
    LegacyImportBundle,
    LegacyMaterialEntry,
    LegacyNameEntry,
    LegacyPartyEntry,
} from "./legacyImportBundle";

// Pure planning logic — no DataPort, no IO (matches every other engine's
// file tree). `LegacyImportCard.tsx` is the only caller: it
// loads what already exists via `DataPort.listMasters`/`listDocs`, hands
// this function that snapshot plus the parsed bundle, then applies the
// returned drafts one `saveMaster`/`saveDoc` call at a time so the UI can
// show live progress and a failure partway through stops cleanly instead
// of losing track of what already committed.

export interface LegacyImportSkip {
    Kind: MasterKind | "Ticket";
    Name: string;
    Reason: string;
}

export interface LegacyImportPlan {
    masterDrafts: { kind: MasterKind; draft: MasterDraft }[];
    ticketDrafts: { legacyId: string; draft: DocDraft }[];
    skipped: LegacyImportSkip[];
}

/** What "already here" means going in — one name-set per master kind, one legacy-id set for tickets. Built by the caller from a fresh `listMasters`/`listDocs` read, never assumed stale. */
export interface LegacyExistingState {
    masterNamesByKind: Partial<Record<MasterKind, Set<string>>>;
    ticketLegacyIds: Set<string>;
}

export const emptyExistingState = (): LegacyExistingState => ({
    masterNamesByKind: {},
    ticketLegacyIds: new Set(),
});

const normalizeName = (name: string): string => name.trim().toLowerCase();

// A master row in the old system has no id this tool can trust to survive
// the trip (v1/v2's own row ids are never in the bundle format, see
// legacyImportBundle.ts's header comment) — matching on the trimmed,
// case-folded Name is the same "good enough at migration-time scale"
// tradeoff the rest of this tool takes, not a general dedupe/merge
// algorithm. A real duplicate that only differs by case or whitespace is
// treated as the same master and skipped, same as an exact match.
interface BuildMasterDraftsArgs<T extends LegacyNameEntry> {
    kind: MasterKind;
    entries: T[] | undefined;
    existingNames: Set<string> | undefined;
    skipped: LegacyImportSkip[];
    buildBody: (entry: T) => JsonRecord;
}

const buildMasterDrafts = <T extends LegacyNameEntry>({
    kind,
    entries,
    existingNames,
    skipped,
    buildBody,
}: BuildMasterDraftsArgs<T>): { kind: MasterKind; draft: MasterDraft }[] => {
    if (!entries?.length) return [];
    const seen = new Set(existingNames ?? []);
    const drafts: { kind: MasterKind; draft: MasterDraft }[] = [];
    for (const entry of entries) {
        const key = normalizeName(entry.Name);
        if (!key) {
            skipped.push({ Kind: kind, Name: entry.Name, Reason: "Blank name" });
            continue;
        }
        if (seen.has(key)) {
            skipped.push({ Kind: kind, Name: entry.Name, Reason: "Already exists (matched by name)" });
            continue;
        }
        seen.add(key);
        drafts.push({
            kind,
            draft: { MasterKind: kind, Name: entry.Name.trim(), Body: buildBody(entry) },
        });
    }
    return drafts;
};

const notesBody = (entry: LegacyNameEntry): JsonRecord => ({
    Notes: entry.Notes?.trim() || undefined,
});

const buildStoredTareDrafts = (
    bundle: LegacyImportBundle,
    existingNames: Set<string> | undefined,
    skipped: LegacyImportSkip[],
): { kind: MasterKind; draft: MasterDraft }[] => {
    if (!bundle.StoredTares?.length) return [];
    const seen = new Set(existingNames ?? []);
    const drafts: { kind: MasterKind; draft: MasterDraft }[] = [];
    for (const entry of bundle.StoredTares) {
        const key = normalizeName(entry.VehicleNo);
        if (!key) {
            skipped.push({ Kind: "StoredTare", Name: entry.VehicleNo, Reason: "Blank vehicle no" });
            continue;
        }
        if (seen.has(key)) {
            skipped.push({
                Kind: "StoredTare",
                Name: entry.VehicleNo,
                Reason: "Already exists (matched by vehicle no)",
            });
            continue;
        }
        seen.add(key);
        drafts.push({
            kind: "StoredTare",
            draft: {
                MasterKind: "StoredTare",
                Name: entry.VehicleNo.trim(),
                Body: {
                    WeightKg: entry.WeightKg,
                    CapturedAt: entry.CapturedAt,
                    PartyName: entry.PartyName?.trim() || undefined,
                },
            },
        });
    }
    return drafts;
};

const buildCapture = (
    type: Capture["Type"],
    weightKg: number,
    at: string | undefined,
    operator: string,
): Capture => ({
    CaptureId: newId(),
    Type: type,
    WeightKg: weightKg,
    At: at ?? new Date(0).toISOString(),
    Operator: operator,
    // "Manual" is the honest source — this weight came from the old
    // system's own record, not this machine's indicator or a stored tare
    // (db/ticketBody.ts's CAPTURE_SOURCES).
    Source: "Manual",
    Images: [],
});

const buildTicketDrafts = (
    bundle: LegacyImportBundle,
    existingLegacyIds: Set<string>,
    skipped: LegacyImportSkip[],
): { legacyId: string; draft: DocDraft }[] => {
    if (!bundle.Tickets?.length) return [];
    const seen = new Set(existingLegacyIds);
    const drafts: { legacyId: string; draft: DocDraft }[] = [];
    for (const entry of bundle.Tickets) {
        if (seen.has(entry.LegacyId)) {
            skipped.push({
                Kind: "Ticket",
                Name: entry.LegacyId,
                Reason: "Already imported (matched by legacy id)",
            });
            continue;
        }
        if (entry.TareKg === undefined && entry.GrossKg === undefined) {
            skipped.push({ Kind: "Ticket", Name: entry.LegacyId, Reason: "No weight on either side" });
            continue;
        }
        seen.add(entry.LegacyId);
        const operator = entry.Operator?.trim() || "Legacy import";
        const captures: Capture[] = [
            ...(entry.TareKg !== undefined
                ? [buildCapture("Tare", entry.TareKg, entry.TareAt, operator)]
                : []),
            ...(entry.GrossKg !== undefined
                ? [buildCapture("Gross", entry.GrossKg, entry.GrossAt, operator)]
                : []),
        ];
        drafts.push({
            legacyId: entry.LegacyId,
            draft: {
                DocKind: "Ticket",
                Body: {
                    BodyVersion: 1,
                    VehicleNo: entry.VehicleNo,
                    Party: entry.Party,
                    Material: entry.Material,
                    Transporter: entry.Transporter,
                    ChallanNo: entry.ChallanNo,
                    Captures: captures,
                    // Passthrough field (TicketBody's own `.passthrough()`
                    // parse) — the whole of this tool's idempotency for
                    // tickets; see legacyImportBundle.ts's `LegacyId` doc.
                    ImportRef: entry.LegacyId,
                },
            },
        });
    }
    return drafts;
};

const SIMPLE_KINDS: { bundleKey: keyof LegacyImportBundle; kind: MasterKind }[] = [
    { bundleKey: "Vehicles", kind: "Vehicle" },
    { bundleKey: "VehicleTypes", kind: "VehicleType" },
    { bundleKey: "Transporters", kind: "Transporter" },
    { bundleKey: "Places", kind: "Place" },
    { bundleKey: "Operators", kind: "Operator" },
];

export const planLegacyImport = (
    bundle: LegacyImportBundle,
    existing: LegacyExistingState,
): LegacyImportPlan => {
    const skipped: LegacyImportSkip[] = [];
    const masterDrafts: { kind: MasterKind; draft: MasterDraft }[] = [
        ...buildMasterDrafts<LegacyPartyEntry>({
            kind: "Party",
            entries: bundle.Parties,
            existingNames: existing.masterNamesByKind.Party,
            skipped,
            buildBody: (entry) => ({
                Notes: entry.Notes?.trim() || undefined,
                Email: entry.Email?.trim() || undefined,
                Phone: entry.Phone?.trim() || undefined,
            }),
        }),
        ...buildMasterDrafts<LegacyMaterialEntry>({
            kind: "Material",
            entries: bundle.Materials,
            existingNames: existing.masterNamesByKind.Material,
            skipped,
            buildBody: (entry) => ({ Notes: entry.Notes?.trim() || undefined, Rate: entry.Rate }),
        }),
        ...SIMPLE_KINDS.flatMap(({ bundleKey, kind }) =>
            buildMasterDrafts<LegacyNameEntry>({
                kind,
                entries: bundle[bundleKey] as LegacyNameEntry[] | undefined,
                existingNames: existing.masterNamesByKind[kind],
                skipped,
                buildBody: notesBody,
            }),
        ),
        ...buildStoredTareDrafts(bundle, existing.masterNamesByKind.StoredTare, skipped),
    ];
    const ticketDrafts = buildTicketDrafts(bundle, existing.ticketLegacyIds, skipped);
    return { masterDrafts, ticketDrafts, skipped };
};
