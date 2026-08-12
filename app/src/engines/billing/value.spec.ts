import { describe, expect, it } from "vitest";

import { computeValue } from "./value";

describe("computeValue", () => {
    it("null when netKg is null", () => {
        expect(computeValue(null, 10)).toBeNull();
    });

    it("null when rate is null", () => {
        expect(computeValue(1000, null)).toBeNull();
    });

    it("null when both are null", () => {
        expect(computeValue(null, null)).toBeNull();
    });

    it("computes net(kg)/1000 * rate, rounded", () => {
        expect(computeValue(1000, 100)).toBe(100);
        expect(computeValue(2500, 40)).toBe(100);
    });

    it("rounds to nearest integer (half-up)", () => {
        // 1234/1000 * 10 = 12.34 -> 12
        expect(computeValue(1234, 10)).toBe(12);
        // 1250/1000 * 10 = 12.5 -> 13 (Math.round rounds .5 up)
        expect(computeValue(1250, 10)).toBe(13);
    });

    it("0 net or 0 rate produces 0, not null", () => {
        expect(computeValue(0, 100)).toBe(0);
        expect(computeValue(1000, 0)).toBe(0);
    });

    it("negative net (e.g. a data error) still computes rather than throwing", () => {
        expect(computeValue(-1000, 100)).toBe(-100);
    });
});
