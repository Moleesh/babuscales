import { describe, expect, it } from "vitest";

import { emptyDash } from "./emptyDash";

describe("emptyDash", () => {
    it("formats a present value with the given formatter", () => {
        expect(emptyDash(1500, (n: number) => `${n} kg`)).toBe("1500 kg");
    });

    it("renders the default em-dash for null", () => {
        expect(emptyDash(null, (n: number) => `${n} kg`)).toBe("—");
    });

    it("renders the default em-dash for undefined", () => {
        expect(emptyDash(undefined, (n: number) => `${n} kg`)).toBe("—");
    });

    it("uses a custom emptyText when given", () => {
        expect(emptyDash(null, (n: number) => `${n}`, "N/A")).toBe("N/A");
    });

    it("does not treat 0 or empty string as empty", () => {
        expect(emptyDash(0, (n: number) => `${n}`)).toBe("0");
        expect(emptyDash("", (s: string) => `[${s}]`)).toBe("[]");
    });
});
