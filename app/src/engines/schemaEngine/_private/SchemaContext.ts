import { createContext } from "react";

import type { Schema } from "../types";

export interface SchemaContextValue {
    ticketSchema: Schema;
    /** Every saved schema (built-in default + every upload), for a Settings dropdown to list — App.tsx's `listTicketSchemas` result, kept live the same way `packs` is for I18nProvider. */
    schemas: Schema[];
    /** Persists via `db/schema.ts` and updates every `useSchema()` consumer — loading/saving is the caller's job, same split as I18nProvider's `packs` prop. Re-saving with the same `SchemaId` overwrites that entry in place (a field-visibility toggle goes through this). */
    setTicketSchema: (schema: Schema) => Promise<void>;
    /** Switches the active schema to one already saved (or the built-in default) without re-uploading it. */
    setActiveSchemaId: (schemaId: string) => Promise<void>;
    /** Re-reads the active schema and the full saved list from the DB, replacing in-memory state — used after `importBackup` (Settings' Backup/Restore card) swaps the whole backing store out from under whatever had loaded before the restore. */
    reloadTicketSchema: () => Promise<void>;
}

export const SchemaContext = createContext<SchemaContextValue | null>(null);
