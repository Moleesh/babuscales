import type { MasterKind } from "@db/types";

import type { MasterFormState } from "./masterFormState";

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the per-kind Body shape handleSave writes,
// unchanged from the inline version it replaces.
export const buildMasterBody = (
    activeKind: MasterKind,
    form: MasterFormState,
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
    if (activeKind === "Material") {
        return {
            Notes: form.notes.trim() || undefined,
            Rate: form.rate.trim() ? Number(form.rate) : undefined,
        };
    }
    if (activeKind === "Party") {
        return {
            Notes: form.notes.trim() || undefined,
            // Task #42 — real e-mail delivery looks a ticket's party up by
            // name and reads this field; empty means "no e-mail on file",
            // same "skip quietly" shape as an empty PartyName on a stored
            // tare above.
            Email: form.email.trim() || undefined,
            // Task #43 — same lookup, for SMS via the GSM modem instead of
            // SMTP.
            Phone: form.phone.trim() || undefined,
        };
    }
    return { Notes: form.notes.trim() || undefined };
};
