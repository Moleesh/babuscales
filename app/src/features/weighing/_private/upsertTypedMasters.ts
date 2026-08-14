import type { UseMasterCache } from "@db/useMasterCache";

import type { WeighingCaches } from "./useWeighingScreenTickets";

// Task: the ⌕ fields' inline "＋ Add" row is gone (TicketFieldsCard.tsx) —
// an operator who types a Vehicle/Party/Material/Transporter that isn't in
// the Masters table yet is no longer forced to click an explicit add
// button first. Instead, on save, whatever they actually typed is
// reconciled into the Masters table here: a value with no matching row
// (case/whitespace-insensitive, same as the dropdown's own match check)
// gets a new master created for it, so it's searchable/recallable from the
// very next ticket. A value that already matches an existing row is left
// alone — this only ever adds masters, it never edits one that already
// exists under that name.
const upsertOne = async (cache: UseMasterCache, kind: FieldCacheEntry["kind"], value: string): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const exists = cache.rows.some((row) => row.Name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    await cache.save({ MasterKind: kind, Name: trimmed, Body: {} });
};

interface FieldCacheEntry {
    kind: "Vehicle" | "Party" | "Material" | "Transporter";
    cache: UseMasterCache;
    value: string;
}

export const upsertTypedMasters = async (
    caches: WeighingCaches,
    fields: { vehicleNo: string; party: string; material: string; transporter: string },
): Promise<void> => {
    const entries: FieldCacheEntry[] = [
        { kind: "Vehicle", cache: caches.vehicle, value: fields.vehicleNo },
        { kind: "Party", cache: caches.party, value: fields.party },
        { kind: "Material", cache: caches.material, value: fields.material },
        { kind: "Transporter", cache: caches.transporter, value: fields.transporter },
    ];
    for (const entry of entries) {
        await upsertOne(entry.cache, entry.kind, entry.value);
    }
};
