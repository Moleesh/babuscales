import type { MasterKind } from "@db/types";
import { fromString, withinDecimalsAllowed } from "@engines/formulaEngine/Decimal";
import type { MasterColumn } from "@engines/schemaEngine";

import type { MasterFormState } from "./masterFormState";

const isValidNumber = (raw: string): boolean => raw.trim() !== "" && Number.isFinite(Number(raw));

// Money columns are stored as decimal strings (see buildMasterBody below),
// so their validity check is "is this a plain decimal literal"
// (`Decimal.fromString`), not the generic float-finite check Number columns
// use. `decimalsAllowed` mirrors `Schema.DecimalsAllowed` (schemaEngine/
// types.ts) — off (the default) additionally rejects a fraction, so a Money
// column is integer-only unless the active schema opts in.
const isValidMoney = (raw: string, decimalsAllowed: boolean): boolean => {
    if (raw.trim() === "") return false;
    try {
        return withinDecimalsAllowed(fromString(raw), decimalsAllowed);
    } catch {
        return false;
    }
};

// Same three-way `DecimalsAllowed` gate, applied to StoredTare's weight —
// parsed through `Decimal.fromString` (not just `Number.isInteger`) so the
// on-case's 2-decimal-digit cap is enforced the same way Money's is.
const isValidWeight = (raw: string, decimalsAllowed: boolean): boolean => {
    if (!isValidNumber(raw)) return false;
    try {
        return withinDecimalsAllowed(fromString(raw.trim()), decimalsAllowed);
    } catch {
        return false;
    }
};

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
    decimalsAllowed: boolean,
): string | null => {
    if (activeKind === "StoredTare") {
        if (form.weightKg.trim() !== "" && !isValidWeight(form.weightKg, decimalsAllowed)) {
            return "masters.error.invalidWeight";
        }
        return null;
    }
    for (const column of columns) {
        if (column.Kind !== "Number" && column.Kind !== "Money") continue;
        const raw = form.extra[column.FieldId] ?? "";
        if (raw.trim() === "") continue;
        const valid = column.Kind === "Money" ? isValidMoney(raw, decimalsAllowed) : isValidNumber(raw);
        if (!valid) return "masters.error.invalidNumber";
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
        // Money columns keep the raw decimal-string text as-is (already
        // validated by validateMasterFormNumbers above) rather than
        // widening through `Number(raw)` — that's exactly the lossy float
        // path this migration removes. Number columns are unaffected: this
        // migration is money-only.
        body[column.FieldId] =
            column.Kind === "Money" ? raw : column.Kind === "Number" ? Number(raw) : column.Kind === "Boolean" ? raw === "true" : raw;
    }
    return body;
};
