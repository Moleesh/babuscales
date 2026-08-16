import { z } from "zod";

import { MASTER_KINDS } from "@db/types";

import type { Schema } from "./types";

// Validates an uploaded schema .json (task #50, PLAN §8) the same way
// legacyImportBundle.ts validates an import bundle — untrusted the moment
// it leaves the filesystem picker, parsed once here rather than trusted by
// every reader. Mirrors `types.ts`'s `Field` union field-for-field; keep
// the two in sync by hand (zod's own type inference isn't used here so the
// hand-written `Schema`/`Field` types stay the single source of truth for
// everything else in the app that imports them).
const localizedSchema = z.object({ en: z.string().min(1) }).catchall(z.string());

const validationRuleSchema = z.object({
    Formula: z.string().min(1),
    Severity: z.enum(["Block", "Warn", "Note"]),
    Message: localizedSchema,
});

const fieldBaseShape = {
    FieldId: z.string().min(1),
    Label: localizedSchema,
    Help: localizedSchema.optional(),
    VisibleWhen: z.string().optional(),
    RequiredWhen: z.string().optional(),
    ReadOnlyWhen: z.string().optional(),
    Validate: z.array(validationRuleSchema).optional(),
    Protected: z.boolean().optional(),
};

const selectOptionSchema = z.object({ Value: z.string().min(1), Label: localizedSchema });

const fieldSchema = z.discriminatedUnion("Kind", [
    z.object({ ...fieldBaseShape, Kind: z.literal("Text"), Upper: z.boolean().optional(), MaxLength: z.number().int().positive().optional() }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Number") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Weight") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Money") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Date") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("DateTime") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Boolean") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Search"), Master: z.enum(MASTER_KINDS) }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Select"), Options: z.array(selectOptionSchema).min(1) }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Formula"), Formula: z.string().min(1) }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Sequence"), ResetPolicy: z.enum(["Manual", "Yearly"]) }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Media") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Note") }),
]);

export const ticketSchemaSchema = z.object({
    SchemaId: z.string().min(1),
    DocKind: z.string().min(1),
    Fields: z.array(fieldSchema).min(1),
});

export const parseTicketSchema = (raw: unknown): Schema => ticketSchemaSchema.parse(raw);
