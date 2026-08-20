import { useState } from "react";
import type { ZodIssue } from "zod";

import { useToast } from "@components/Toast";
import { DEFAULT_TICKET_SCHEMA, getAllFields, ticketSchemaSchema } from "@engines/schemaEngine";
import type { Schema } from "@engines/schemaEngine";
import { useTranslation } from "@i18n/useTranslation";

import { repairJson } from "./repairJson";

// Tries the text as typed first, then a best-effort repair (comments and
// trailing commas dropped, bare keys and single-quoted strings requoted) —
// covers the same slip-ups the paste box's own Prettify button fixes, so
// Apply doesn't hard-fail on a schema that only needed that cleanup.
const parseLeniently = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return JSON.parse(repairJson(text));
    }
};

interface FlashMessage {
    text: string;
    bad: boolean;
}

// Zod's own wording ("Invalid input: expected string, received undefined")
// is accurate but says nothing about *where* in the pasted/uploaded JSON the
// problem is — turn the issue's `path` (e.g. ["Segments", 0, "Fields", 2,
// "FieldId"]) into a plain "Segments[0].Fields[2].FieldId" pointer, and
// translate the couple of Zod phrasings we actually hit into wording an
// operator recognizes.
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
    const { showToast } = useToast();
    const { t } = useTranslation();

    const applySchemaText = async (text: string): Promise<void> => {
        setSchemaBusy(true);
        try {
            const parsed = ticketSchemaSchema.safeParse(parseLeniently(text));
            if (!parsed.success) {
                setSchemaMessage({
                    text: `Not a field schema — ${describeSchemaIssue(parsed.error.issues[0])}`,
                    bad: true,
                });
                return;
            }
            await setTicketSchema(parsed.data);
            setSchemaMessage({ text: `Applied · ${getAllFields(parsed.data).length} fields`, bad: false });
            showToast(t("components.toast.saved"));
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
            showToast(t("components.toast.saved"));
        } finally {
            setSchemaBusy(false);
        }
    };

    return { schemaMessage, schemaBusy, handleSchemaFile, handleSchemaText: applySchemaText, resetSchema };
};
