import { useMemo } from "react";
import type { ReactNode } from "react";

import { SchemaContext } from "./_private/SchemaContext";
import type { Schema } from "./types";

export interface SchemaProviderProps {
    /** Already loaded from `config` (ConfigKind: "Schema") by `db/schema.ts`'s `loadTicketSchema` — App.tsx's job, same split as I18nProvider's `packs` prop. Falls back to `DEFAULT_TICKET_SCHEMA` until a site saves its own. */
    ticketSchema: Schema;
    /** `db/schema.ts`'s `listTicketSchemas` result — every saved schema, for a Settings dropdown. */
    schemas: Schema[];
    onSetTicketSchema: (schema: Schema) => Promise<void>;
    onSetActiveSchemaId: (schemaId: string) => Promise<void>;
    /** See `SchemaContextValue.reloadTicketSchema`. */
    onReloadTicketSchema: () => Promise<void>;
    children: ReactNode;
}

// No internal state to own — unlike I18nProvider's `lang` (a per-session
// UI choice), there is exactly one *active* ticket schema at a time, and
// App.tsx already owns that value (it has to, since saving it is an IO
// call through `useDataPort`). This provider is just the wiring that lets
// `useSchema()` reach it from anywhere in the tree without threading a
// prop through every screen.
export const SchemaProvider = ({
    ticketSchema,
    schemas,
    onSetTicketSchema,
    onSetActiveSchemaId,
    onReloadTicketSchema,
    children,
}: SchemaProviderProps) => {
    const value = useMemo(
        () => ({
            ticketSchema,
            schemas,
            setTicketSchema: onSetTicketSchema,
            setActiveSchemaId: onSetActiveSchemaId,
            reloadTicketSchema: onReloadTicketSchema,
        }),
        [ticketSchema, schemas, onSetTicketSchema, onSetActiveSchemaId, onReloadTicketSchema],
    );
    return <SchemaContext.Provider value={value}>{children}</SchemaContext.Provider>;
};
