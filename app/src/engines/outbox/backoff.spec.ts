import { describe, expect, it } from "vitest";

import { MAX_OUTBOX_ATTEMPTS, nextBackoffDelayMs, reconcileOutboxOutcome } from "./backoff";

describe("nextBackoffDelayMs", () => {
    it("returns the 4-step schedule: 30s, 2min, 10min, 1hr", () => {
        expect(nextBackoffDelayMs(0)).toBe(30_000);
        expect(nextBackoffDelayMs(1)).toBe(2 * 60_000);
        expect(nextBackoffDelayMs(2)).toBe(10 * 60_000);
        expect(nextBackoffDelayMs(3)).toBe(60 * 60_000);
    });

    it("null once attempts has exhausted every step", () => {
        expect(nextBackoffDelayMs(4)).toBeNull();
        expect(nextBackoffDelayMs(5)).toBeNull();
        expect(nextBackoffDelayMs(100)).toBeNull();
    });

    it("null for a negative attempts value rather than throwing", () => {
        expect(nextBackoffDelayMs(-1)).toBeNull();
    });

    it("MAX_OUTBOX_ATTEMPTS matches the schedule length (4)", () => {
        expect(MAX_OUTBOX_ATTEMPTS).toBe(4);
    });
});

describe("reconcileOutboxOutcome", () => {
    const NOW = Date.parse("2026-01-01T00:00:00.000Z");

    it("success: State Sent, Attempts incremented, NextTryAt cleared", () => {
        const patch = reconcileOutboxOutcome({ Ok: true }, 0, NOW);
        expect(patch).toEqual({ State: "Sent", Attempts: 1, NextTryAt: null });
    });

    it("success clears NextTryAt even on a later attempt", () => {
        const patch = reconcileOutboxOutcome({ Ok: true }, 3, NOW);
        expect(patch).toEqual({ State: "Sent", Attempts: 4, NextTryAt: null });
    });

    it("first failure (attemptsBefore 0): schedules retry 30s out", () => {
        const patch = reconcileOutboxOutcome({ Ok: false }, 0, NOW);
        expect(patch.State).toBe("Failed");
        expect(patch.Attempts).toBe(1);
        expect(patch.NextTryAt).toBe(new Date(NOW + 30_000).toISOString());
    });

    it("second failure (attemptsBefore 1): schedules retry 2min out", () => {
        const patch = reconcileOutboxOutcome({ Ok: false }, 1, NOW);
        expect(patch.NextTryAt).toBe(new Date(NOW + 2 * 60_000).toISOString());
    });

    it("third failure (attemptsBefore 2): schedules retry 10min out", () => {
        const patch = reconcileOutboxOutcome({ Ok: false }, 2, NOW);
        expect(patch.NextTryAt).toBe(new Date(NOW + 10 * 60_000).toISOString());
    });

    it("fourth failure (attemptsBefore 3): schedules retry 1hr out", () => {
        const patch = reconcileOutboxOutcome({ Ok: false }, 3, NOW);
        expect(patch.NextTryAt).toBe(new Date(NOW + 60 * 60_000).toISOString());
    });

    it("fifth failure (attemptsBefore 4, schedule exhausted): permanently failed, NextTryAt null", () => {
        const patch = reconcileOutboxOutcome({ Ok: false }, 4, NOW);
        expect(patch).toEqual({ State: "Failed", Attempts: 5, NextTryAt: null });
    });

    it("attempts beyond exhaustion stay permanently failed", () => {
        const patch = reconcileOutboxOutcome({ Ok: false }, 10, NOW);
        expect(patch).toEqual({ State: "Failed", Attempts: 11, NextTryAt: null });
    });
});
