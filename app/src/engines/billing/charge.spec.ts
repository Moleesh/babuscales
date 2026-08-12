import { describe, expect, it } from "vitest";

import { computeCharge, GROSS_CHARGE_INR, TARE_CHARGE_INR } from "./charge";

describe("computeCharge", () => {
    it("null when not complete", () => {
        expect(computeCharge(false)).toBeNull();
    });

    it("flat sum of tare + gross charge when complete", () => {
        expect(computeCharge(true)).toBe(TARE_CHARGE_INR + GROSS_CHARGE_INR);
        expect(computeCharge(true)).toBe(250);
    });
});
