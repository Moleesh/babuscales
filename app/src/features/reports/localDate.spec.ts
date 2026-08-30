import { describe, expect, it } from "vitest";

import { toLocalDateOnly } from "./localDate";

describe("toLocalDateOnly", () => {
    it("formats as yyyy-MM-dd using local getters", () => {
        expect(toLocalDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
    });

    it("zero-pads single-digit month and day", () => {
        expect(toLocalDateOnly(new Date(2026, 2, 3))).toBe("2026-03-03");
    });

    it("does not shift the day the way toISOString could for a positive UTC offset", () => {
        // Local midnight, 23:00 the previous UTC day for e.g. IST (+5:30) —
        // toLocalDateOnly must read the LOCAL date, not re-derive via UTC.
        const localMidnight = new Date(2026, 5, 15, 0, 0, 0);
        expect(toLocalDateOnly(localMidnight)).toBe("2026-06-15");
    });

    it("handles December 31 / year rollover correctly", () => {
        expect(toLocalDateOnly(new Date(2025, 11, 31))).toBe("2025-12-31");
    });
});
