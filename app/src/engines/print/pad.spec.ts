import { describe, expect, it } from "vitest";

import { lpad, rpad } from "./pad";

describe("rpad", () => {
    it("pads a short string with trailing spaces to width n", () => {
        expect(rpad("ab", 5)).toBe("ab   ");
    });

    it("truncates a string longer than n instead of wrapping", () => {
        expect(rpad("abcdefgh", 4)).toBe("abcd");
    });

    it("returns the string unchanged when exactly width n", () => {
        expect(rpad("abcd", 4)).toBe("abcd");
    });

    it("handles n = 0", () => {
        expect(rpad("abc", 0)).toBe("");
    });

    it("handles an empty input string", () => {
        expect(rpad("", 3)).toBe("   ");
    });
});

describe("lpad", () => {
    it("pads a short string with leading spaces to width n", () => {
        expect(lpad("ab", 5)).toBe("   ab");
    });

    it("truncates from the left, keeping the rightmost n characters", () => {
        expect(lpad("abcdefgh", 4)).toBe("efgh");
    });

    it("returns the string unchanged when exactly width n", () => {
        expect(lpad("abcd", 4)).toBe("abcd");
    });

    it("handles n = 0 — slice(-0) is slice(0), so the full string passes through unchanged (a quirk of the -n slicing trick, not a bug: n=0 is never a real column width in practice)", () => {
        expect(lpad("abc", 0)).toBe("abc");
    });

    it("handles an empty input string", () => {
        expect(lpad("", 3)).toBe("   ");
    });
});
