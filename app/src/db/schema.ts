import { DEFAULT_TICKET_SCHEMA, ticketSchemaSchema } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";

import type { DataPort } from "./DataPort";

// One row, keyed by DocKind rather than by SchemaId (loadLanguagePacks.ts's
// `lang-${code}` is keyed per-pack because a site keeps many packs
// installed at once; a site has exactly one *active* schema per DocKind,
// so re-saving replaces it in place rather than accumulating history) —
// task #50, PLAN §8. "Ticket" is the only DocKind with a schema today
// (Invoice has no engine behind it yet), so this is deliberately narrow
// rather than a generic `loadSchema(docKind)` nothing else would call.
const TICKET_SCHEMA_CONFIG_ID = "schema-Ticket";

/** Falls back to `DEFAULT_TICKET_SCHEMA` if nothing was ever saved, or if the saved row fails validation (corrupt, or written by a future version this build doesn't understand) — the app still runs with its built-in fields rather than crashing startup. */
export const loadTicketSchema = async (db: DataPort): Promise<Schema> => {
    const row = await db.getConfig(TICKET_SCHEMA_CONFIG_ID);
    if (!row) return DEFAULT_TICKET_SCHEMA;
    const parsed = ticketSchemaSchema.safeParse(row.Body);
    return parsed.success ? parsed.data : DEFAULT_TICKET_SCHEMA;
};

export const saveTicketSchema = (db: DataPort, schema: Schema): Promise<void> =>
    db
        .saveConfig({ ConfigId: TICKET_SCHEMA_CONFIG_ID, ConfigKind: "Schema", Body: schema })
        .then(() => undefined);
