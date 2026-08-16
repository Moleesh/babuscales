import { DEFAULT_TICKET_SCHEMA, ticketSchemaSchema } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";

import type { DataPort } from "./DataPort";

// Every uploaded schema gets its own row, keyed off its own SchemaId (same
// "code, not a file" shape as i18n/loadLanguagePacks.ts's
// `languagePackConfigId`) — a re-upload with the same SchemaId overwrites
// just that row instead of accumulating history, but a *different* SchemaId
// is a new row, so a site can keep several schemas saved (e.g. one per
// season/customer) and switch between them. Task: "allow multiple uploads
// and have a drop to list them ... with same schema id we will override".
export const ticketSchemaConfigId = (schemaId: string): string => `schema-Ticket-${schemaId}`;

// Which saved schema is the *active* one is tracked in a row of its own,
// separate from the schemas themselves — switching the active schema is
// then just repointing this row, no re-save of the schema body it points at.
const ACTIVE_TICKET_SCHEMA_CONFIG_ID = "schema-Ticket-active";

/** Every schema a site has ever uploaded, keyed by SchemaId, plus the built-in default (always present, even before any upload) — for a Settings dropdown to choose from. Rows that fail validation (corrupt, or written by a future version this build doesn't understand) are silently dropped. */
export const listTicketSchemas = async (db: DataPort): Promise<Schema[]> => {
    const rows = await db.listConfig({ ConfigKind: "Schema" });
    const byId = new Map<string, Schema>([[DEFAULT_TICKET_SCHEMA.SchemaId, DEFAULT_TICKET_SCHEMA]]);
    for (const row of rows) {
        if (row.ConfigId === ACTIVE_TICKET_SCHEMA_CONFIG_ID) continue;
        const parsed = ticketSchemaSchema.safeParse(row.Body);
        if (parsed.success) byId.set(parsed.data.SchemaId, parsed.data);
    }
    return [...byId.values()];
};

/** Falls back to `DEFAULT_TICKET_SCHEMA` if nothing has ever been made active, or if the active pointer/row fails validation (corrupt, or the pointed-at schema was since deleted). */
export const loadTicketSchema = async (db: DataPort): Promise<Schema> => {
    const pointer = await db.getConfig(ACTIVE_TICKET_SCHEMA_CONFIG_ID);
    const activeId = typeof pointer?.Body.SchemaId === "string" ? pointer.Body.SchemaId : null;
    if (!activeId || activeId === DEFAULT_TICKET_SCHEMA.SchemaId) return DEFAULT_TICKET_SCHEMA;
    const row = await db.getConfig(ticketSchemaConfigId(activeId));
    if (!row) return DEFAULT_TICKET_SCHEMA;
    const parsed = ticketSchemaSchema.safeParse(row.Body);
    return parsed.success ? parsed.data : DEFAULT_TICKET_SCHEMA;
};

/** Saves (or overwrites, same SchemaId) an uploaded/edited schema and makes it the active one — the single call both a fresh upload and a field-visibility toggle (re-saving the active schema with one field patched) go through. */
export const saveTicketSchema = async (db: DataPort, schema: Schema): Promise<void> => {
    await db.saveConfig({
        ConfigId: ticketSchemaConfigId(schema.SchemaId),
        ConfigKind: "Schema",
        Body: schema,
    });
    await setActiveTicketSchemaId(db, schema.SchemaId);
};

/** Switches the active schema to one already saved (or the built-in default) without re-uploading it — the dropdown's own handler. */
export const setActiveTicketSchemaId = (db: DataPort, schemaId: string): Promise<void> =>
    db
        .saveConfig({
            ConfigId: ACTIVE_TICKET_SCHEMA_CONFIG_ID,
            ConfigKind: "Schema",
            Body: { SchemaId: schemaId },
        })
        .then(() => undefined);
