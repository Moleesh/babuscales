import type { MemoryState } from "./state";
import { nowIso } from "./state";
import type { DataPort } from "../../DataPort";
import { newId } from "../../id";
import { masterDraftSchema } from "../../schemas";
import type { MasterDraft, MasterQuery, MasterRow } from "../../types";

type MasterMethods = Pick<DataPort, "getMaster" | "listMasters" | "saveMaster">;

const matches = (row: MasterRow, query: MasterQuery): boolean => {
    if (query.MasterKind && row.MasterKind !== query.MasterKind) return false;
    if (query.IsActive !== undefined && row.IsActive !== query.IsActive) return false;
    if (query.Search && !row.Name.toLowerCase().includes(query.Search.toLowerCase())) return false;
    return true;
};

export const createMasterMethods = (state: MemoryState): MasterMethods => ({
    getMaster: (masterId) => Promise.resolve(state.masters.get(masterId) ?? null),

    listMasters: (query = {}) => {
        const rows = Array.from(state.masters.values())
            .filter((row) => matches(row, query))
            .sort((a, b) => a.Name.localeCompare(b.Name));
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
});
