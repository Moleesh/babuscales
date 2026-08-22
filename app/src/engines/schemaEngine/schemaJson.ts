import { z } from "zod";

import { MASTER_KINDS } from "@db/types";

import type { Schema } from "./types";

// Validates an uploaded schema .json the same way
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
    Label: localizedSchema.optional(),
    Help: localizedSchema.optional(),
    Visible: z.boolean().optional(),
    Required: z.boolean().optional(),
    ReadOnly: z.boolean().optional(),
    Validate: z.array(validationRuleSchema).optional(),
    Calculated: z.boolean().optional(),
    Captured: z.enum(["Gross", "Tare"]).optional(),
    Manual: z.boolean().optional(),
    Group: z.enum(["Intermediate", "Final"]).optional(),
};

const selectOptionSchema = z.object({ Value: z.string().min(1), Label: localizedSchema });

const autofillLinkSchema = z.object({ Field: z.string().min(1), Column: z.string().min(1) });

const fieldSchema = z.discriminatedUnion("Kind", [
    z.object({ ...fieldBaseShape, Kind: z.literal("Text"), Upper: z.boolean().optional(), MaxLength: z.number().int().positive().optional() }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Number") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Weight") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Money") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Date") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("DateTime") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("TicketDate") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Boolean") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Search"), Master: z.enum(MASTER_KINDS), Autofills: z.array(autofillLinkSchema).optional() }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Select"), Options: z.array(selectOptionSchema).min(1) }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Formula"), Formula: z.string().min(1) }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Sequence"), ResetPolicy: z.enum(["Manual", "Yearly"]) }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Media") }),
    z.object({ ...fieldBaseShape, Kind: z.literal("Note") }),
]);

const masterColumnBaseShape = {
    FieldId: z.string().min(1),
    Label: localizedSchema.optional(),
    Required: z.boolean().optional(),
};

const masterColumnSchema = z.discriminatedUnion("Kind", [
    z.object({ ...masterColumnBaseShape, Kind: z.literal("Text") }),
    z.object({ ...masterColumnBaseShape, Kind: z.literal("Number") }),
    z.object({ ...masterColumnBaseShape, Kind: z.literal("Money") }),
    z.object({ ...masterColumnBaseShape, Kind: z.literal("Boolean") }),
    z.object({ ...masterColumnBaseShape, Kind: z.literal("Select"), Options: z.array(selectOptionSchema).min(1) }),
    z.object({ ...masterColumnBaseShape, Kind: z.literal("Note") }),
]);

const masterSchemaSchema = z.object({
    Kind: z.enum(MASTER_KINDS),
    Columns: z.array(masterColumnSchema),
});

const fieldSegmentSchema = z.object({
    Segment: z.string().min(1),
    Label: localizedSchema.optional(),
    Kind: z.enum(["Enterable", "Calculated"]).optional(),
    Fields: z.array(fieldSchema).min(1),
});

export const ticketSchemaSchema = z.object({
    SchemaId: z.string().min(1),
    Segments: z.array(fieldSegmentSchema).min(1),
    Masters: z.array(masterSchemaSchema).optional(),
});

export const parseTicketSchema = (raw: unknown): Schema => ticketSchemaSchema.parse(raw);
