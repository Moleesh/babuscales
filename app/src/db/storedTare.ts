import type { JsonRecord } from "./types";

// PLAN §9.1 — "Stored Tares get their own view — vehicle, weight, captured
// date and time, age, party, and a staleness warning." Shared between the
// Masters browser (the view itself) and Weighing (§9.2's recall offer).
// The default expiry window is a placeholder; PLAN §9.2 calls for it to be
// a configurable "strict tare" setting, which is Settings work — tracked
// as a known gap (app/README.md) rather than hardcoded permanently.
export const STORED_TARE_STALE_AFTER_DAYS = 30;

export interface StoredTareBody extends JsonRecord {
    WeightKg: number;
    CapturedAt: string;
    PartyName?: string;
}

export const isStoredTareBody = (body: JsonRecord): body is StoredTareBody =>
    typeof body.WeightKg === "number" && typeof body.CapturedAt === "string";

export const storedTareAgeDays = (capturedAt: string): number => {
    const capturedMs = new Date(capturedAt).getTime();
    if (Number.isNaN(capturedMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - capturedMs) / (1000 * 60 * 60 * 24)));
};

export const isStoredTareStale = (capturedAt: string): boolean =>
    storedTareAgeDays(capturedAt) > STORED_TARE_STALE_AFTER_DAYS;
