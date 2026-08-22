import type { MemoryState } from "./state";
import { nowIso } from "./state";
import type { DataPort } from "../../DataPort";
import { newId } from "../../id";
import { masterDraftSchema } from "../../schemas";
import type { MasterDraft, MasterQuery, MasterRow } from "../../types";

type MasterMethods = Pick<DataPort, "getMaster" | "listMasters" | "saveMaster" | "deleteMaster">;

const matches = (row: MasterRow, query: MasterQuery): boolean => {
    if (query.MasterKind && row.MasterKind !== query.MasterKind) return false;
    if (query.IsActive !== undefined && row.IsActive !== query.IsActive) return false;
    if (query.Search && !row.Name.toLowerCase().includes(query.Search.toLowerCase())) return false;
    return true;
};

// Same order the Tauri adapter sorts by (name COLLATE NOCASE ASC, then
// master_id) so both adapters keyset-paginate identically.
const compareRows = (a: MasterRow, b: MasterRow): number =>
    a.Name.localeCompare(b.Name, undefined, { sensitivity: "base" }) || a.MasterId.localeCompare(b.MasterId);

// True once `row` is strictly after `query.After` in `compareRows` order —
// the in-memory mirror of masters.rs's `(name, master_id) > (:n, :m)` clause.
const isAfterCursor = (row: MasterRow, after: NonNullable<MasterQuery["After"]>): boolean => {
    const cmp = row.Name.localeCompare(after.Name, undefined, { sensitivity: "base" });
    return cmp > 0 || (cmp === 0 && row.MasterId.localeCompare(after.MasterId) > 0);
};

export const createMasterMethods = (state: MemoryState): MasterMethods => ({
    getMaster: (masterId) => Promise.resolve(state.masters.get(masterId) ?? null),

    listMasters: (query = {}) => {
        const rows = Array.from(state.masters.values())
            .filter((row) => matches(row, query))
            .filter((row) => (query.After ? isAfterCursor(row, query.After) : true))
            .sort(compareRows);
        return Promise.resolve(query.Limit !== undefined ? rows.slice(0, query.Limit) : rows);
    },

    saveMaster: (draft: MasterDraft) => {
        const parsed = masterDraftSchema.parse(draft);
        const existing = parsed.MasterId ? state.masters.get(parsed.MasterId) : undefined;
        const row: MasterRow = {
            MasterId: existing?.MasterId ?? parsed.MasterId ?? newId(),
            MasterKind: parsed.MasterKind,
            Name: parsed.Name,
            Body: parsed.Body,
            IsActive: parsed.IsActive ?? existing?.IsActive ?? true,
            UpdatedAt: nowIso(),
        };
        state.masters.set(row.MasterId, row);
        return Promise.resolve(row);
    },

    deleteMaster: (masterId: string) => {
        state.masters.delete(masterId);
        return Promise.resolve();
    },
});
