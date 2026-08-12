import { describe, expect, it } from "vitest";

import { EN_STRINGS } from "../strings";
import { TA_PACK } from "./ta";

// ta.ts's own doc comment: "Keep this file's key set in sync with
// EN_STRINGS by hand — there is no build-time check enforcing the two
// match." This is that check — not build-time, but at least test-time, so
// a key added to one and forgotten in the other fails CI instead of just
// silently falling back to English at runtime.
describe("TA_PACK: key set stays in sync with EN_STRINGS", () => {
    it("has a Tamil string for every EN_STRINGS key", () => {
        const missing = Object.keys(EN_STRINGS).filter((key) => !(key in TA_PACK.Strings));
        expect(missing).toEqual([]);
    });

    it("has no stray keys EN_STRINGS doesn't also have", () => {
        const stray = Object.keys(TA_PACK.Strings).filter((key) => !(key in EN_STRINGS));
        expect(stray).toEqual([]);
    });

    it("every translated value is non-empty", () => {
        const empty = Object.entries(TA_PACK.Strings).filter(([, value]) => value.trim() === "");
        expect(empty).toEqual([]);
    });
});
