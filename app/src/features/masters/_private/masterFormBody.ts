import type { MasterKind } from "@db/types";
import type { MasterColumn } from "@engines/schemaEngine";

import type { MasterFormState } from "./masterFormState";

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the per-kind Body shape handleSave writes.
// Non-StoredTare kinds now build it generically from `columns` (the active
// kind's schema-declared Masters columns) instead of a fixed
// notes/rate/email/phone shape — a new column just works without touching
// this file — lets you specify what all column a master needs.
export const buildMasterBody = (
    activeKind: MasterKind,
    form: MasterFormState,
    columns: MasterColumn[],
): Record<string, unknown> => {
    if (activeKind === "StoredTare") {
        return {
            WeightKg: Number(form.weightKg) || 0,
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
