import { describe, expect, it } from "vitest";

import { getMaterialRate } from "./materialBody";

describe("getMaterialRate", () => {
    it("returns the numeric Rate when present", () => {
        expect(getMaterialRate({ Rate: 42.5 })).toBe(42.5);
    });

    it("returns null when Rate is absent", () => {
        expect(getMaterialRate({})).toBeNull();
    });

    it("returns null when Rate is present but not a number (e.g. a string)", () => {
        expect(getMaterialRate({ Rate: "42" })).toBeNull();
    });

    it("returns null for Rate: null explicitly", () => {
        expect(getMaterialRate({ Rate: null })).toBeNull();
    });

    it("0 is a valid rate, not treated as absent", () => {
        expect(getMaterialRate({ Rate: 0 })).toBe(0);
    });
});
