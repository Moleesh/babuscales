import type { MasterKind } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";
import type { MasterSchema } from "@engines/schemaEngine";

import type { WeighingCaches } from "./useWeighingScreenTickets";

// An operator who types a Vehicle/Party/Material/Transporter that isn't in
// the Masters table yet isn't forced to click an explicit add button first.
// Instead, on save, whatever they actually typed is reconciled into the
// Masters table here: a value with no matching row (case/whitespace-
// insensitive, same as the dropdown's own match check) gets a new master
// created for it, so it's searchable/recallable from the very next ticket.
// A value that already matches an existing row is left alone — this only
// ever adds masters, it never edits one that already exists under that
// name.
//
// Gated per-Master (schemaEngine's `MasterSchema.AutoAddOnUse`/
// `HideAutoAddedFromList`). `masterSchema` is the active ticket schema's own
// config entry for this kind, or `undefined` for a kind the schema doesn't
// declare at all (masterKindMeta.ts's `visibleMasterKinds`) — either way, an
// absent config or an absent flag on it means "keep doing what this always
// did", so a schema saved before this feature existed behaves identically.
const upsertOne = async (
    cache: UseMasterCache,
    kind: FieldCacheEntry["kind"],
    value: string,
    masterSchema: MasterSchema | undefined,
): Promise<void> => {
    if (masterSchema?.AutoAddOnUse === false) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    // KNOWN RACE: this check-then-insert isn't atomic. Two saves for the
    // same new name landing close together (e.g. two tickets typed in quick
    // succession before either save's `reloadToken` bump has repopulated
    // `cache.rows`) can both see `exists === false` and each create their
    // own master row for the same name. Fixing this properly needs a
    // DB-level case-insensitive unique constraint on (MasterKind, Name) —
    // out of scope here; this comment just documents the gap.
    const exists = cache.rows.some((row) => row.Name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    // `AutoAdded` only ever gets set here, never read back by this cache —
    // it's the marker `useMasterListPage.ts` filters the admin browse list
    // on. Manually editing this exact row later (`useMasterFormActions.ts`'s
    // `handleSave`) rebuilds `Body` from the edit form's own columns, which
    // drops this key — that's the "admin manually promotes it" path, no
    // separate un-hide action needed.
    const body = masterSchema?.HideAutoAddedFromList ? { AutoAdded: true } : {};
    await cache.save({ MasterKind: kind, Name: trimmed, Body: body });
};

interface FieldCacheEntry {
    kind: "Vehicle" | "Party" | "Material" | "Transporter";
    cache: UseMasterCache;
    value: string;
}

export const upsertTypedMasters = async (
    caches: WeighingCaches,
    fields: { vehicleNo: string; party: string; material: string; transporter: string },
    masterSchemas: MasterSchema[] = [],
): Promise<void> => {
    const byKind = new Map<MasterKind, MasterSchema>(masterSchemas.map((entry) => [entry.Kind, entry]));
    const entries: FieldCacheEntry[] = [
        { kind: "Vehicle", cache: caches.vehicle, value: fields.vehicleNo },
        { kind: "Party", cache: caches.party, value: fields.party },
        { kind: "Material", cache: caches.material, value: fields.material },
        { kind: "Transporter", cache: caches.transporter, value: fields.transporter },
    ];
    for (const entry of entries) {
        await upsertOne(entry.cache, entry.kind, entry.value, byKind.get(entry.kind));
    }
};
