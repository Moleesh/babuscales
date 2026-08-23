import type { MasterKind } from "@db/types";
import type { MasterColumn } from "@engines/schemaEngine";

import type { MasterFormState } from "./masterFormState";

const isValidNumber = (raw: string): boolean => raw.trim() !== "" && Number.isFinite(Number(raw));

// Checked before `buildMasterBody` writes anything — a non-empty value that
// doesn't parse as a finite number (StoredTare's weight/tare field, or any
// Number/Money column) used to silently become 0/NaN. An *empty* field is
// still fine (omitted from Body below); it's only a non-empty *invalid*
// value that's rejected here. Returns a translation-key-ish plain message
// (surfaced near Save, same spot the empty-name error already uses) or null
// when the form is numerically valid.
export const validateMasterFormNumbers = (
    activeKind: MasterKind,
    form: MasterFormState,
    columns: MasterColumn[],
): string | null => {
    if (activeKind === "StoredTare") {
        if (form.weightKg.trim() !== "" && !isValidNumber(form.weightKg)) {
            return "masters.error.invalidWeight";
        }
        return null;
    }
    for (const column of columns) {
        if (column.Kind !== "Number" && column.Kind !== "Money") continue;
        const raw = form.extra[column.FieldId] ?? "";
        if (raw.trim() !== "" && !isValidNumber(raw)) {
            return "masters.error.invalidNumber";
        }
    }
    return null;
};

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the per-kind Body shape handleSave writes.
// Non-StoredTare kinds now build it generically from `columns` (the active
// kind's schema-declared Masters columns) instead of a fixed
// notes/rate/email/phone shape — a new column just works without touching
// this file — lets you specify what all column a master needs. Callers are
// expected to run `validateMasterFormNumbers` first and block the save on a
// non-null result, so every Number()/Money value reaching here is either
// empty (already filtered out) or a valid finite number.
export const buildMasterBody = (
    activeKind: MasterKind,
    form: MasterFormState,
    columns: MasterColumn[],
): Record<string, unknown> => {
    if (activeKind === "StoredTare") {
        return {
            WeightKg: isValidNumber(form.weightKg) ? Number(form.weightKg) : 0,
            CapturedAt: form.capturedAt
                ? new Date(form.capturedAt).toISOString()
                : new Date().toISOString(),
            PartyName: form.partyName.trim() || undefined,
        };
    }
    const body: Record<string, unknown> = {};
    for (const column of columns) {
        const raw = (form.extra[column.FieldId] ?? "").trim();
        if (!raw) continue;
        body[column.FieldId] =
            column.Kind === "Number" || column.Kind === "Money" ? Number(raw) : column.Kind === "Boolean" ? raw === "true" : raw;
    }
    return body;
};
