// Indian digit grouping (lakh/crore, not thousands) — every weight, count
// and money figure in the app reads this way, per demo/BabuScales-demo.html.
export const INDIAN_LOCALE = "en-IN";

export const formatWeightKg = (kg: number): string => kg.toLocaleString(INDIAN_LOCALE);

// Ported from the mock's `money()` — `decimalPlaces` is Settings' System
// pane "Amount rounding" (`Formats.AmountDp`), not a fixed 2, so a site
// that bills in whole rupees doesn't see fake paise.
export const formatMoney = (amount: number, decimalPlaces: 0 | 2): string =>
    `₹ ${amount.toLocaleString(INDIAN_LOCALE, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    })}`;
