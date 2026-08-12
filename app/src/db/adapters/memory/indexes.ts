import { createConfigMethods } from "./configs";
import type { MemoryState } from "./state";
import { isValidIndexPath } from "../../../engines/indexEngine";
import type { DataPort } from "../../DataPort";
import type { ConfigRow } from "../../types";

type IndexMethods = Pick<DataPort, "createCustomIndex" | "dropCustomIndex">;

interface IndexBody {
    [key: string]: unknown;
    IndexName: string;
    Table: "doc" | "master";
    Path: string;
    Active: boolean;
}

const deriveIndexName = (table: "doc" | "master", path: string): string =>
    `ix_custom_${table}_${path.replace(/\./g, "_")}`;

// No real SQLite underneath the memory adapter, so there is no DDL to run
// here — the Tauri adapter's `create_custom_index`/`drop_custom_index`
// (src-tauri/src/commands/indexes.rs) is where `CREATE INDEX`/`DROP INDEX`
// actually execute. This adapter's job is only to make the same `config`
// row shape (`ConfigKind: "Index"`) appear, via the same `saveConfig` the
// generic config methods already provide, so Settings UI code behaves
// identically against either adapter. Path validation still runs here (the
// same regex the Rust side enforces) so the demo doesn't silently accept
// something the real build would reject.
export const createIndexMethods = (state: MemoryState): IndexMethods => {
    const { saveConfig } = createConfigMethods(state);

    return {
        createCustomIndex: async (table, path) => {
            if (table !== "doc" && table !== "master") {
                throw new Error(`createCustomIndex: unknown table ${JSON.stringify(table)}`);
            }
            if (!isValidIndexPath(path)) {
                throw new Error(`createCustomIndex: invalid path ${JSON.stringify(path)}`);
            }
            const indexName = deriveIndexName(table, path);
            const body: IndexBody = { IndexName: indexName, Table: table, Path: path, Active: true };
            return saveConfig({ ConfigKind: "Index", Body: body });
        },

        dropCustomIndex: async (configId) => {
            const row: ConfigRow | undefined = state.configs.get(configId);
            if (!row) throw new Error(`dropCustomIndex: no config row ${JSON.stringify(configId)}`);
            if (row.ConfigKind !== "Index") {
                throw new Error(`dropCustomIndex: config row ${configId} is not an Index row`);
            }
            const body = row.Body as unknown as IndexBody;
            const nextBody: IndexBody = { ...body, Active: false };
            return saveConfig({ ConfigId: configId, ConfigKind: "Index", Body: nextBody });
        },
    };
};
