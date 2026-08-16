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
}

export const SchemaContext = createContext<SchemaContextValue | null>(null);
