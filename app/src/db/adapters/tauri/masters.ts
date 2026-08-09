import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import type { MasterDraft, MasterRow } from "../../types";

type MasterMethods = Pick<DataPort, "getMaster" | "listMasters" | "saveMaster">;

export const createMasterMethods = (): MasterMethods => ({
    getMaster: (masterId) => invoke<MasterRow | null>("get_master", { masterId }),

    listMasters: (query) => invoke<MasterRow[]>("list_masters", { query }),

    saveMaster: (draft: MasterDraft) => invoke<MasterRow>("save_master", { draft }),
});
