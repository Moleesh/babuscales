import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import type { ConfigRow } from "../../types";

type IndexMethods = Pick<DataPort, "createCustomIndex" | "dropCustomIndex">;

// Thin wire to src-tauri/src/commands/indexes.rs — see that file for the
// validation this delegates to (table enum + path/index-name regexes). This
// adapter does no validation of its own; it is a transport, not a gate.
export const createIndexMethods = (): IndexMethods => ({
    createCustomIndex: (table, path) =>
        invoke<ConfigRow>("create_custom_index", { table, path }),

    dropCustomIndex: (configId) => invoke<ConfigRow>("drop_custom_index", { configId }),
});
