import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import { masterDraftSchema } from "../../schemas";
import type { MasterDraft, MasterRow } from "../../types";

type MasterMethods = Pick<DataPort, "getMaster" | "listMasters" | "saveMaster">;

// Zod at every boundary (docs/CodingStandards.md) — see configs.ts's own
// comment on this same pattern.
export const createMasterMethods = (): MasterMethods => ({
    getMaster: (masterId) => invoke<MasterRow | null>("get_master", { masterId }),

    listMasters: (query) => invoke<MasterRow[]>("list_masters", { query }),

    saveMaster: (draft: MasterDraft) =>
        invoke<MasterRow>("save_master", { draft: masterDraftSchema.parse(draft) }),
});
