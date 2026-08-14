import { describe, expect, it } from "vitest";

import {
    formatDateInFmt,
    formatDateTimeInFmt,
    formatMoney,
    formatTimeInFmt,
    formatWeightKg,
    INDIAN_LOCALE,
} from "./numberFormat";

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

describe("formatDateInFmt", () => {
    // 5 March 2026 — single-digit day/month, so pad2 zero-padding is exercised too.
    const date = new Date(2026, 2, 5);

    it("renders dd MMM yyyy with an English month name for lang=en", () => {
        expect(formatDateInFmt(date, "en", "dd MMM yyyy")).toBe("05 Mar 2026");
    });

    it("renders dd MMM yyyy with a Tamil month name for lang=ta", () => {
        expect(formatDateInFmt(date, "ta", "dd MMM yyyy")).toBe(
            `05 ${date.toLocaleDateString("ta-IN", { month: "short" })} 2026`,
        );
    });

    it("renders dd-MM-yyyy", () => {
        expect(formatDateInFmt(date, "en", "dd-MM-yyyy")).toBe("05-03-2026");
    });

    it("renders dd/MM/yy with a two-digit year", () => {
        expect(formatDateInFmt(date, "en", "dd/MM/yy")).toBe("05/03/26");
    });

    it("renders yyyy-MM-dd", () => {
        expect(formatDateInFmt(date, "en", "yyyy-MM-dd")).toBe("2026-03-05");
    });
});

describe("formatTimeInFmt", () => {
    // 14:05 — afternoon, so 24h vs 12h actually differ (and minute padding is exercised).
    const date = new Date(2026, 2, 5, 14, 5, 0);

    it("renders 24-hour time", () => {
        expect(formatTimeInFmt(date, "en", "24")).toBe(
            date.toLocaleTimeString("en-IN", { hour12: false }),
        );
    });

    it("renders 12-hour time with an am/pm marker", () => {
        expect(formatTimeInFmt(date, "en", "12")).toBe(
            date.toLocaleTimeString("en-IN", { hour12: true }),
        );
    });
});

describe("formatDateTimeInFmt", () => {
    const date = new Date(2026, 2, 5, 14, 5, 0);

    it("joins the pattern-formatted date and the 24/12-hour time with a space", () => {
        expect(formatDateTimeInFmt(date, "en", "dd-MM-yyyy", "24")).toBe(
            `05-03-2026 ${date.toLocaleTimeString("en-IN", { hour12: false })}`,
        );
        expect(formatDateTimeInFmt(date, "en", "yyyy-MM-dd", "12")).toBe(
            `2026-03-05 ${date.toLocaleTimeString("en-IN", { hour12: true })}`,
        );
    });
});
