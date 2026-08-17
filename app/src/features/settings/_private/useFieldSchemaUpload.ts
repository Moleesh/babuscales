import { useState } from "react";
import type { ZodIssue } from "zod";

import { DEFAULT_TICKET_SCHEMA, ticketSchemaSchema } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";

interface FlashMessage {
    text: string;
    bad: boolean;
}

// Zod's own wording ("Invalid input: expected string, received undefined")
// is accurate but says nothing about *where* in the pasted/uploaded JSON the
// problem is — turn the issue's `path` (e.g. ["Fields", 2, "FieldId"]) into
// a plain "Fields[2].FieldId" pointer, and translate the couple of Zod
// phrasings we actually hit into wording an operator recognizes.
const describeSchemaIssue = (issue: ZodIssue | undefined): string => {
    if (!issue) return "invalid shape";
    const where = issue.path.length
        ? issue.path.reduce<string>(
              (acc, segment) =>
                  typeof segment === "number" ? `${acc}[${segment}]` : acc ? `${acc}.${String(segment)}` : String(segment),
              "",
          )
        : null;
    const reason = /received undefined/.test(issue.message) ? "missing" : issue.message;
    return where ? `${where} — ${reason}` : reason;
};

export interface UseFieldSchemaUpload {
    schemaMessage: FlashMessage | null;
    schemaBusy: boolean;
    handleSchemaFile: (file: File) => Promise<void>;
    /** Same parse/apply path as `handleSchemaFile`, for the "paste JSON" box next to the drop-zone — no File to read, just the raw text. */
    handleSchemaText: (text: string) => Promise<void>;
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

    const applySchemaText = async (text: string): Promise<void> => {
        setSchemaBusy(true);
        try {
            const parsed = ticketSchemaSchema.safeParse(JSON.parse(text));
            if (!parsed.success) {
                setSchemaMessage({
                    text: `Not a field schema — ${describeSchemaIssue(parsed.error.issues[0])}`,
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

    const handleSchemaFile = async (file: File): Promise<void> => applySchemaText(await file.text());

    const resetSchema = async (): Promise<void> => {
        setSchemaBusy(true);
        try {
            await setTicketSchema(DEFAULT_TICKET_SCHEMA);
            setSchemaMessage({ text: "Reset to the built-in default schema", bad: false });
        } finally {
            setSchemaBusy(false);
        }
    };

    return { schemaMessage, schemaBusy, handleSchemaFile, handleSchemaText: applySchemaText, resetSchema };
};
