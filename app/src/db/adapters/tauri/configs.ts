import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import { configDraftSchema } from "../../schemas";
import type { ConfigDraft, ConfigRow } from "../../types";

type ConfigMethods = Pick<DataPort, "getConfig" | "listConfig" | "saveConfig" | "deleteConfig">;

// Zod at every boundary (docs/CodingStandards.md) — the memory adapter
// already parses drafts with these same schemas before writing; this
// adapter used to skip that and hand a draft straight to `invoke()`, so a
// caller bug only surfaced as a Rust-side error deep in src-tauri/src/store
// instead of failing right here with a field-level message.
export const createConfigMethods = (): ConfigMethods => ({
    getConfig: (configId) => invoke<ConfigRow | null>("get_config", { configId }),

    listConfig: (query) => invoke<ConfigRow[]>("list_config", { query }),

    saveConfig: (draft: ConfigDraft) =>
        invoke<ConfigRow>("save_config", { draft: configDraftSchema.parse(draft) }),

    deleteConfig: (configId) => invoke<void>("delete_config", { configId }),
});
