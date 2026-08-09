import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import type { ConfigDraft, ConfigRow } from "../../types";

type ConfigMethods = Pick<DataPort, "getConfig" | "listConfig" | "saveConfig">;

export const createConfigMethods = (): ConfigMethods => ({
    getConfig: (configId) => invoke<ConfigRow | null>("get_config", { configId }),

    listConfig: (query) => invoke<ConfigRow[]>("list_config", { query }),

    saveConfig: (draft: ConfigDraft) => invoke<ConfigRow>("save_config", { draft }),
});
