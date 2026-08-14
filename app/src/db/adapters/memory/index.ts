import { createAssetMethods } from "./assets";
import { createAuditMethods } from "./audit";
import { createBackupMethods } from "./backup";
import { createConfigMethods } from "./configs";
import { createDocMethods } from "./docs";
import { createMasterMethods } from "./masters";
import { createOutboxMethods } from "./outbox";
import { createMemoryState } from "./state";
import type { DataPort } from "../../DataPort";

// The Pages-demo shipping target, not a test double (app/README.md). Every
// method here does exactly what the Tauri/SQLite adapter's does — insert,
// hash, chain, filter — just against a plain object instead of a file, so
// the same UI code runs unmodified with `VITE_DATA_ADAPTER=memory`.
export const createMemoryAdapter = (): DataPort => {
    const state = createMemoryState();
    return {
        ...createDocMethods(state),
        ...createMasterMethods(state),
        ...createConfigMethods(state),
        ...createAssetMethods(state),
        ...createAuditMethods(state),
        ...createOutboxMethods(state),
        ...createBackupMethods(state),
    };
};
