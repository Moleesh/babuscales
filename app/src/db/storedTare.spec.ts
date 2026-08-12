import { describe, expect, it, vi } from "vitest";

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
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
        expect(storedTareAgeDays("2026-06-15T12:00:00.000Z")).toBe(0);
        vi.useRealTimers();
    });

    it("computes whole days elapsed, floored", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
        // 2.5 days earlier
        expect(storedTareAgeDays("2026-06-13T00:00:00.000Z")).toBe(2);
        vi.useRealTimers();
    });

    it("never negative — a future CapturedAt clamps to 0", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
        expect(storedTareAgeDays("2026-06-20T00:00:00.000Z")).toBe(0);
        vi.useRealTimers();
    });

    it("returns 0 for an unparseable date string, not NaN", () => {
        expect(storedTareAgeDays("not-a-date")).toBe(0);
    });
});

describe("isStoredTareStale", () => {
    it("not stale exactly at the threshold (strictly greater-than)", () => {
        vi.useFakeTimers();
        const now = new Date("2026-06-15T00:00:00.000Z");
        vi.setSystemTime(now);
        const capturedAt = new Date(
            now.getTime() - STORED_TARE_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
        expect(isStoredTareStale(capturedAt)).toBe(false);
        vi.useRealTimers();
    });

    it("stale one day past the threshold", () => {
        vi.useFakeTimers();
        const now = new Date("2026-06-15T00:00:00.000Z");
        vi.setSystemTime(now);
        const capturedAt = new Date(
            now.getTime() - (STORED_TARE_STALE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000,
        ).toISOString();
        expect(isStoredTareStale(capturedAt)).toBe(true);
        vi.useRealTimers();
    });

    it("a fresh capture is never stale", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));
        expect(isStoredTareStale("2026-06-15T00:00:00.000Z")).toBe(false);
        vi.useRealTimers();
    });
});
