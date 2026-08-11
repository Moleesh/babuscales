import { describe, expect, it } from "vitest";

import { formatMoney, formatWeightKg, INDIAN_LOCALE } from "./numberFormat";

describe("formatWeightKg", () => {
    it("groups digits the Indian way (lakh/crore), not thousands", () => {
        expect(formatWeightKg(1234567)).toBe((1234567).toLocaleString(INDIAN_LOCALE));
        expect(formatWeightKg(1234567)).toBe("12,34,567");
    });

    it("renders small values without grouping", () => {
        expect(formatWeightKg(850)).toBe("850");
    });
});

describe("formatMoney", () => {
    it("prefixes the rupee sign and groups the Indian way", () => {
        expect(formatMoney(1234567, 2)).toBe("₹ 12,34,567.00");
    });

    it("shows no paise when decimalPlaces is 0 (whole-rupee billing)", () => {
        expect(formatMoney(1500, 0)).toBe("₹ 1,500");
    });

    it("always shows exactly two decimals when decimalPlaces is 2, even for whole amounts", () => {
        expect(formatMoney(1500, 2)).toBe("₹ 1,500.00");
    });
});
