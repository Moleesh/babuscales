import type { JsonRecord } from "./types";

// "Stored Tares get their own view — vehicle, weight, captured
// date and time, age, party, and a staleness warning." Shared between the
// Masters browser (the view itself) and Weighing (the recall offer).
// The default expiry window is a placeholder; it's meant to become
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

/** `now` is the caller's `Date.now()` — injected rather than read here (docs/CodingStandards.md §2) so this stays testable without mocking global time. */
export const storedTareAgeDays = (capturedAt: string, now: number): number => {
    const capturedMs = new Date(capturedAt).getTime();
    if (Number.isNaN(capturedMs)) return 0;
    return Math.max(0, Math.floor((now - capturedMs) / (1000 * 60 * 60 * 24)));
};

/** `now` is the caller's `Date.now()` — see `storedTareAgeDays`. */
export const isStoredTareStale = (capturedAt: string, now: number): boolean =>
    storedTareAgeDays(capturedAt, now) > STORED_TARE_STALE_AFTER_DAYS;
