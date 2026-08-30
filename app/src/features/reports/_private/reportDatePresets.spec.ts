import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { datePresetRange } from "./reportDatePresets";

describe("datePresetRange", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 15)); // local: 15 Jun 2026 (Monday)
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("'today' spans just today, both bounds equal", () => {
        expect(datePresetRange("today")).toEqual({ from: "2026-06-15", to: "2026-06-15" });
    });

    it("'week' is a rolling 7-day window inclusive of today (today - 6 days)", () => {
        expect(datePresetRange("week")).toEqual({ from: "2026-06-09", to: "2026-06-15" });
    });

    it("'month' starts at the 1st of the current month", () => {
        expect(datePresetRange("month")).toEqual({ from: "2026-06-01", to: "2026-06-15" });
    });

    it("'year' starts at Jan 1 of the current year", () => {
        expect(datePresetRange("year")).toEqual({ from: "2026-01-01", to: "2026-06-15" });
    });

    it("'all' clears both bounds", () => {
        expect(datePresetRange("all")).toEqual({ from: "", to: "" });
    });

    it("'week' correctly crosses a month boundary", () => {
        vi.setSystemTime(new Date(2026, 6, 2)); // 2 Jul 2026
        expect(datePresetRange("week")).toEqual({ from: "2026-06-26", to: "2026-07-02" });
    });

    it("'week' correctly crosses a year boundary", () => {
        vi.setSystemTime(new Date(2026, 0, 3)); // 3 Jan 2026
        expect(datePresetRange("week")).toEqual({ from: "2025-12-28", to: "2026-01-03" });
    });
});
