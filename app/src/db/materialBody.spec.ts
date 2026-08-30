import { describe, expect, it } from "vitest";

import { getMaterialRate } from "./materialBody";

describe("getMaterialRate", () => {
    it("returns the decimal-string Rate when present", () => {
        expect(getMaterialRate({ Rate: "42.50" })).toBe("42.50");
    });

    it("returns null when Rate is absent", () => {
        expect(getMaterialRate({})).toBeNull();
    });

    it("returns null when Rate is present but not a string (e.g. a legacy number)", () => {
        expect(getMaterialRate({ Rate: 42 })).toBeNull();
    });

    it("returns null for Rate: null explicitly", () => {
        expect(getMaterialRate({ Rate: null })).toBeNull();
    });

    it("returns null when Rate is a string but not a plain decimal literal", () => {
        expect(getMaterialRate({ Rate: "abc" })).toBeNull();
    });

    it("0 is a valid rate, not treated as absent", () => {
        expect(getMaterialRate({ Rate: "0" })).toBe("0");
    });
});
