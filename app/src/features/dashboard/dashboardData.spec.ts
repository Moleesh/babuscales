import { describe, expect, it } from "vitest";

import type { TicketRow } from "@features/reports";

import {
    computeActivityBuckets,
    computeDashboardKpis,
    computeMaterialSplit,
    hourlyTicketCounts,
    isInPeriod,
    isSameDay,
} from "./dashboardData";

const row = (overrides: Partial<TicketRow>): TicketRow =>
    ({
        at: "2026-06-15T10:00:00.000Z",
        isCancelled: false,
        isOpen: false,
        netKg: 1000,
        charge: null,
        material: "Sand",
        ...overrides,
    }) as TicketRow;

describe("isSameDay", () => {
    // Local Date constructors — isSameDay compares LOCAL calendar dates
    // (see its own comment), so UTC-"Z" literals would make these
    // assertions depend on the host machine's UTC offset.
    it("true for the same local calendar day", () => {
        expect(
            isSameDay(
                new Date(2026, 5, 15, 1, 0, 0).toISOString(),
                new Date(2026, 5, 15, 23, 0, 0).toISOString(),
            ),
        ).toBe(true);
    });

    it("false across a local day boundary", () => {
        expect(
            isSameDay(
                new Date(2026, 5, 15, 23, 59, 59).toISOString(),
                new Date(2026, 5, 16, 0, 0, 1).toISOString(),
            ),
        ).toBe(false);
    });

    // Regression: isSameDay used to slice raw ISO strings (UTC calendar
    // day), which for a positive UTC offset (e.g. IST, UTC+5:30) put the
    // "day" boundary at UTC midnight — 05:30 local — instead of local
    // midnight. Two instants either side of local midnight but on the SAME
    // UTC calendar day must compare as different days; two instants on
    // DIFFERENT UTC calendar days but the same local day must compare equal.
    it("compares local calendar days, not raw UTC ISO-string prefixes", () => {
        const localMidnight = new Date(2026, 5, 15, 0, 0, 0);
        const justBeforeLocalMidnight = new Date(2026, 5, 14, 23, 59, 0);
        expect(isSameDay(localMidnight.toISOString(), justBeforeLocalMidnight.toISOString())).toBe(false);
    });
});

describe("isInPeriod", () => {
    // Local Date constructors throughout — isInPeriod reads year/month/day
    // via local getters, so ISO-string literals with a trailing "Z" would
    // make these assertions depend on the host machine's UTC offset.
    const ref = new Date(2026, 5, 15, 12, 0, 0).toISOString();

    it("'all' is always true", () => {
        expect(isInPeriod(new Date(2000, 0, 1).toISOString(), ref, "all")).toBe(true);
    });

    it("'day' matches isSameDay", () => {
        expect(isInPeriod(new Date(2026, 5, 15, 0, 0, 1).toISOString(), ref, "day")).toBe(true);
        expect(isInPeriod(new Date(2026, 5, 14, 23, 59, 59).toISOString(), ref, "day")).toBe(false);
    });

    it("'month' matches same year+month regardless of day", () => {
        expect(isInPeriod(new Date(2026, 5, 1, 0, 0, 0).toISOString(), ref, "month")).toBe(true);
        expect(isInPeriod(new Date(2026, 4, 31, 23, 59, 59).toISOString(), ref, "month")).toBe(false);
    });

    it("'year' matches same year regardless of month", () => {
        expect(isInPeriod(new Date(2026, 0, 1, 0, 0, 0).toISOString(), ref, "year")).toBe(true);
        expect(isInPeriod(new Date(2025, 11, 31, 23, 59, 59).toISOString(), ref, "year")).toBe(false);
    });

    it("'week' matches same Mon-Sun week (week starts Monday)", () => {
        // 2026-06-15 is a Monday.
        expect(isInPeriod(new Date(2026, 5, 15, 0, 0, 0).toISOString(), ref, "week")).toBe(true);
        expect(isInPeriod(new Date(2026, 5, 21, 23, 59, 59).toISOString(), ref, "week")).toBe(true); // Sunday same week
        expect(isInPeriod(new Date(2026, 5, 22, 0, 0, 0).toISOString(), ref, "week")).toBe(false); // next Monday
        expect(isInPeriod(new Date(2026, 5, 14, 23, 59, 59).toISOString(), ref, "week")).toBe(false); // prior Sunday
    });
});

describe("hourlyTicketCounts", () => {
    const ref = "2026-06-15T12:00:00.000Z";

    it("returns a zero-filled bucket for every operating hour (6..20) when there are no rows", () => {
        const buckets = hourlyTicketCounts([], ref);
        expect(buckets).toHaveLength(15); // 6..20 inclusive
        expect(buckets.every((b) => b.count === 0)).toBe(true);
        expect(buckets[0]?.hour).toBe(6);
        expect(buckets.at(-1)?.hour).toBe(20);
    });

    it("counts rows into their local hour bucket", () => {
        const rows = [
            row({ at: new Date(2026, 5, 15, 9, 0).toISOString() }),
            row({ at: new Date(2026, 5, 15, 9, 30).toISOString() }),
            row({ at: new Date(2026, 5, 15, 10, 0).toISOString() }),
        ];
        const refLocal = new Date(2026, 5, 15, 12, 0).toISOString();
        const buckets = hourlyTicketCounts(rows, refLocal);
        expect(buckets.find((b) => b.hour === 9)?.count).toBe(2);
        expect(buckets.find((b) => b.hour === 10)?.count).toBe(1);
    });

    it("ignores rows outside the reference day", () => {
        const rows = [row({ at: new Date(2026, 5, 14, 9, 0).toISOString() })];
        const refLocal = new Date(2026, 5, 15, 12, 0).toISOString();
        const buckets = hourlyTicketCounts(rows, refLocal);
        expect(buckets.every((b) => b.count === 0)).toBe(true);
    });

    it("ignores rows outside operating hours (before 6 or after 20)", () => {
        const rows = [
            row({ at: new Date(2026, 5, 15, 3, 0).toISOString() }),
            row({ at: new Date(2026, 5, 15, 23, 0).toISOString() }),
        ];
        const refLocal = new Date(2026, 5, 15, 12, 0).toISOString();
        const buckets = hourlyTicketCounts(rows, refLocal);
        expect(buckets.every((b) => b.count === 0)).toBe(true);
    });
});

describe("computeActivityBuckets", () => {
    it("'day' delegates to hourlyTicketCounts-shaped buckets with padded hour labels", () => {
        const refLocal = new Date(2026, 5, 15, 9, 0).toISOString();
        const buckets = computeActivityBuckets([], refLocal, "day");
        expect(buckets[0]?.label).toBe("06");
        expect(buckets.find((b) => b.id === "9")?.current).toBe(true);
    });

    it("'week' buckets by weekday Mon..Sun and marks the current weekday", () => {
        // 2026-06-15 is a Monday
        const refLocal = new Date(2026, 5, 15, 12, 0).toISOString();
        const rows = [row({ at: new Date(2026, 5, 16, 9, 0).toISOString() })]; // Tuesday
        const buckets = computeActivityBuckets(rows, refLocal, "week");
        expect(buckets.map((b) => b.label)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
        expect(buckets.find((b) => b.label === "Tue")?.count).toBe(1);
        expect(buckets.find((b) => b.label === "Mon")?.current).toBe(true);
    });

    it("'week' excludes cancelled rows", () => {
        const refLocal = new Date(2026, 5, 15, 12, 0).toISOString();
        const rows = [row({ at: refLocal, isCancelled: true })];
        const buckets = computeActivityBuckets(rows, refLocal, "week");
        expect(buckets.every((b) => b.count === 0)).toBe(true);
    });

    it("'month' buckets by day-of-month with the correct day count for the month", () => {
        const refLocal = new Date(2026, 1, 10, 12, 0).toISOString(); // Feb 2026 (28 days, not a leap year)
        const buckets = computeActivityBuckets([], refLocal, "month");
        expect(buckets).toHaveLength(28);
        expect(buckets.find((b) => b.label === "10")?.current).toBe(true);
    });

    it("'year' buckets by month with 12 entries", () => {
        const refLocal = new Date(2026, 5, 15).toISOString();
        const rows = [row({ at: new Date(2026, 2, 1).toISOString() })]; // March
        const buckets = computeActivityBuckets(rows, refLocal, "year");
        expect(buckets).toHaveLength(12);
        expect(buckets.find((b) => b.label === "Mar")?.count).toBe(1);
        expect(buckets.find((b) => b.label === "Jun")?.current).toBe(true);
    });

    it("'all' buckets by calendar year, oldest first", () => {
        const refLocal = new Date(2026, 5, 15).toISOString();
        const rows = [
            row({ at: new Date(2024, 0, 1).toISOString() }),
            row({ at: new Date(2025, 0, 1).toISOString() }),
            row({ at: new Date(2025, 6, 1).toISOString() }),
        ];
        const buckets = computeActivityBuckets(rows, refLocal, "all");
        expect(buckets.map((b) => b.label)).toEqual(["2024", "2025"]);
        expect(buckets.find((b) => b.label === "2025")?.count).toBe(2);
    });
});

describe("computeDashboardKpis", () => {
    const ref = "2026-06-15T12:00:00.000Z";

    it("all zero for an empty rows array", () => {
        const kpis = computeDashboardKpis([], ref, "day");
        expect(kpis).toEqual({
            ticketsToday: 0,
            netTonnesToday: 0,
            waitingCount: 0,
            avgNetKgPerTicket: 0,
            chargeToday: 0,
        });
    });

    it("counts tickets, tonnage and charge only for the current period, excluding cancelled", () => {
        const rows = [
            row({ at: ref, netKg: 1000, charge: "50" }),
            row({ at: ref, netKg: 2000, charge: "100" }),
            row({ at: ref, isCancelled: true, netKg: 5000, charge: "500" }),
            row({ at: "2020-01-01T00:00:00Z", netKg: 9999 }), // different period
        ];
        const kpis = computeDashboardKpis(rows, ref, "day");
        expect(kpis.ticketsToday).toBe(2);
        expect(kpis.netTonnesToday).toBe(3); // (1000+2000)/1000
        expect(kpis.chargeToday).toBe(150);
        expect(kpis.avgNetKgPerTicket).toBe(1500);
    });

    it("waitingCount counts open tickets across ALL rows, not scoped to the period", () => {
        const rows = [
            row({ at: "2020-01-01T00:00:00Z", isOpen: true, netKg: null }),
            row({ at: ref, isOpen: true, netKg: null }),
        ];
        const kpis = computeDashboardKpis(rows, ref, "day");
        expect(kpis.waitingCount).toBe(2);
    });

    it("avgNetKgPerTicket is 0 when there are no completed tickets, not NaN", () => {
        const rows = [row({ at: ref, netKg: null })];
        const kpis = computeDashboardKpis(rows, ref, "day");
        expect(kpis.avgNetKgPerTicket).toBe(0);
        expect(Number.isNaN(kpis.avgNetKgPerTicket)).toBe(false);
    });
});

describe("computeMaterialSplit", () => {
    const ref = "2026-06-15T12:00:00.000Z";

    it("empty array for no rows", () => {
        expect(computeMaterialSplit([], ref, 5, "day")).toEqual([]);
    });

    it("groups by material, sums tonnage, and computes share of the period total", () => {
        const rows = [
            row({ at: ref, material: "Sand", netKg: 3000 }),
            row({ at: ref, material: "Sand", netKg: 1000 }),
            row({ at: ref, material: "Gravel", netKg: 1000 }),
        ];
        const split = computeMaterialSplit(rows, ref, 5, "day");
        const sand = split.find((s) => s.material === "Sand")!;
        const gravel = split.find((s) => s.material === "Gravel")!;
        expect(sand.tonnes).toBe(4);
        expect(sand.count).toBe(2);
        expect(sand.share).toBeCloseTo(0.8);
        expect(gravel.tonnes).toBe(1);
        expect(gravel.share).toBeCloseTo(0.2);
    });

    it("sorts heaviest-first", () => {
        const rows = [
            row({ material: "Light", netKg: 100, at: ref }),
            row({ material: "Heavy", netKg: 9000, at: ref }),
        ];
        const split = computeMaterialSplit(rows, ref, 5, "day");
        expect(split[0]?.material).toBe("Heavy");
    });

    it("caps to the given limit", () => {
        const rows = ["A", "B", "C", "D"].map((m) => row({ material: m, netKg: 1000, at: ref }));
        expect(computeMaterialSplit(rows, ref, 2, "day")).toHaveLength(2);
    });

    it("excludes cancelled rows and rows without a completed net weight", () => {
        const rows = [
            row({ material: "Sand", netKg: 1000, at: ref, isCancelled: true }),
            row({ material: "Sand", netKg: null, at: ref }),
        ];
        expect(computeMaterialSplit(rows, ref, 5, "day")).toEqual([]);
    });

    it("blank material falls back to the em-dash key", () => {
        const rows = [row({ material: "", netKg: 1000, at: ref })];
        expect(computeMaterialSplit(rows, ref, 5, "day")[0]?.material).toBe("—");
    });
});
