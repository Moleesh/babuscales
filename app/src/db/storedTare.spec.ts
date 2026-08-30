import { describe, expect, it } from "vitest";

import {
    isStoredTareBody,
    isStoredTareStale,
    storedTareAgeDays,
    STORED_TARE_STALE_AFTER_DAYS,
} from "./storedTare";

describe("isStoredTareBody", () => {
    it("true for a well-shaped body", () => {
        expect(isStoredTareBody({ WeightKg: 500, CapturedAt: "2026-01-01" })).toBe(true);
    });

    it("false when WeightKg is missing or wrong type", () => {
        expect(isStoredTareBody({ CapturedAt: "2026-01-01" })).toBe(false);
        expect(isStoredTareBody({ WeightKg: "500", CapturedAt: "2026-01-01" })).toBe(false);
    });

    it("false when CapturedAt is missing or wrong type", () => {
        expect(isStoredTareBody({ WeightKg: 500 })).toBe(false);
        expect(isStoredTareBody({ WeightKg: 500, CapturedAt: 123 })).toBe(false);
    });

    it("extra fields (e.g. PartyName) don't disqualify it", () => {
        expect(isStoredTareBody({ WeightKg: 500, CapturedAt: "x", PartyName: "Acme" })).toBe(true);
    });
});

describe("storedTareAgeDays", () => {
    it("0 for right now", () => {
        const now = new Date("2026-06-15T12:00:00.000Z").getTime();
        expect(storedTareAgeDays("2026-06-15T12:00:00.000Z", now)).toBe(0);
    });

    it("computes whole days elapsed, floored", () => {
        const now = new Date("2026-06-15T12:00:00.000Z").getTime();
        // 2.5 days earlier
        expect(storedTareAgeDays("2026-06-13T00:00:00.000Z", now)).toBe(2);
    });

    it("never negative — a future CapturedAt clamps to 0", () => {
        const now = new Date("2026-06-15T12:00:00.000Z").getTime();
        expect(storedTareAgeDays("2026-06-20T00:00:00.000Z", now)).toBe(0);
    });

    it("returns 0 for an unparseable date string, not NaN", () => {
        expect(storedTareAgeDays("not-a-date", Date.now())).toBe(0);
    });
});

describe("isStoredTareStale", () => {
    it("not stale exactly at the threshold (strictly greater-than)", () => {
        const now = new Date("2026-06-15T00:00:00.000Z").getTime();
        const capturedAt = new Date(
            now - STORED_TARE_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
        expect(isStoredTareStale(capturedAt, now)).toBe(false);
    });

    it("stale one day past the threshold", () => {
        const now = new Date("2026-06-15T00:00:00.000Z").getTime();
        const capturedAt = new Date(
            now - (STORED_TARE_STALE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000,
        ).toISOString();
        expect(isStoredTareStale(capturedAt, now)).toBe(true);
    });

    it("a fresh capture is never stale", () => {
        const now = new Date("2026-06-15T00:00:00.000Z").getTime();
        expect(isStoredTareStale("2026-06-15T00:00:00.000Z", now)).toBe(false);
    });
});
