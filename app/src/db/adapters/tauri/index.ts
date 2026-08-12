import { createAssetMethods } from "./assets";
import { createAuditMethods } from "./audit";
import { createBackupMethods } from "./backup";
import { createConfigMethods } from "./configs";
import { createDocMethods } from "./docs";
import { createIndexMethods } from "./indexes";
import { createMasterMethods } from "./masters";
import { createOutboxMethods } from "./outbox";
import type { DataPort } from "../../DataPort";

// The desktop shipping target (app/README.md) — every method here is a
// thin `invoke()` call into src-tauri/src/commands/, which delegates to
// src-tauri/src/store/. Same DataPort contract the memory adapter fulfils,
// so nothing above this layer knows or cares which one is running.
export const createTauriAdapter = (): DataPort => ({
    ...createDocMethods(),
    ...createMasterMethods(),
    ...createConfigMethods(),
    ...createIndexMethods(),
    ...createAssetMethods(),
    ...createAuditMethods(),
    ...createOutboxMethods(),
    ...createBackupMethods(),
});
