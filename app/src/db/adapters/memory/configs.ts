import type { MemoryState } from "./state";
import { nowIso } from "./state";
import type { DataPort } from "../../DataPort";
import { newId } from "../../id";
import { configDraftSchema } from "../../schemas";
import type { ConfigDraft, ConfigRow } from "../../types";

type ConfigMethods = Pick<DataPort, "getConfig" | "listConfig" | "saveConfig">;

export const createConfigMethods = (state: MemoryState): ConfigMethods => ({
    getConfig: (configId) => Promise.resolve(state.configs.get(configId) ?? null),

    listConfig: (query = {}) => {
        const rows = Array.from(state.configs.values()).filter(
            (row) => !query.ConfigKind || row.ConfigKind === query.ConfigKind,
        );
        return Promise.resolve(rows);
    },

    saveConfig: (draft: ConfigDraft) => {
        const parsed = configDraftSchema.parse(draft);
        const existing = parsed.ConfigId ? state.configs.get(parsed.ConfigId) : undefined;
        const row: ConfigRow = {
            ConfigId: existing?.ConfigId ?? parsed.ConfigId ?? newId(),
            ConfigKind: parsed.ConfigKind,
            Body: parsed.Body,
            Version: parsed.Version ?? (existing ? existing.Version + 1 : 1),
            UpdatedAt: nowIso(),
        };
        state.configs.set(row.ConfigId, row);
        return Promise.resolve(row);
    },
});
