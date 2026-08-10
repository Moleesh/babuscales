import { createContext } from "react";

import type { Schema } from "../types";

export interface SchemaContextValue {
    ticketSchema: Schema;
    /** Persists via `db/schema.ts` and updates every `useSchema()` consumer — loading/saving is the caller's job, same split as I18nProvider's `packs` prop. */
    setTicketSchema: (schema: Schema) => Promise<void>;
}

export const SchemaContext = createContext<SchemaContextValue | null>(null);
