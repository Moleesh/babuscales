import { useState } from "react";

import { DEFAULT_TICKET_SCHEMA, ticketSchemaSchema } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";

interface FlashMessage {
    text: string;
    bad: boolean;
}

export interface UseFieldSchemaUpload {
    schemaMessage: FlashMessage | null;
    schemaBusy: boolean;
    handleSchemaFile: (file: File) => Promise<void>;
    resetSchema: () => Promise<void>;
}

// Split out of FieldsLanguagePane (over the line budget — docs/CodingStandards.md)
// — the "Field schema" card's upload/reset handlers, unchanged from the
// inline versions they replace.
export const useFieldSchemaUpload = (
    setTicketSchema: (schema: Schema) => Promise<void>,
): UseFieldSchemaUpload => {
    const [schemaMessage, setSchemaMessage] = useState<FlashMessage | null>(null);
    const [schemaBusy, setSchemaBusy] = useState(false);

    const handleSchemaFile = async (file: File): Promise<void> => {
        setSchemaBusy(true);
        try {
            const text = await file.text();
            const parsed = ticketSchemaSchema.safeParse(JSON.parse(text));
            if (!parsed.success) {
                setSchemaMessage({
                    text: `Not a field schema — ${parsed.error.issues[0]?.message ?? "invalid shape"}`,
                    bad: true,
                });
                return;
            }
            await setTicketSchema(parsed.data);
            setSchemaMessage({ text: `Applied · ${parsed.data.Fields.length} fields`, bad: false });
        } catch (err) {
            setSchemaMessage({
                text: `Not valid JSON — ${err instanceof Error ? err.message : String(err)}`,
                bad: true,
            });
        } finally {
            setSchemaBusy(false);
        }
    };

    const resetSchema = async (): Promise<void> => {
        setSchemaBusy(true);
        try {
            await setTicketSchema(DEFAULT_TICKET_SCHEMA);
            setSchemaMessage({ text: "Reset to the built-in default schema", bad: false });
        } finally {
            setSchemaBusy(false);
        }
    };

    return { schemaMessage, schemaBusy, handleSchemaFile, resetSchema };
};
