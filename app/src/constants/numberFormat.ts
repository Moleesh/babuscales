// Indian digit grouping (lakh/crore, not thousands) — every weight, count
// and money figure in the app reads this way, per demo/BabuScales-demo.html.
export const INDIAN_LOCALE = "en-IN";

export const formatWeightKg = (kg: number): string => kg.toLocaleString(INDIAN_LOCALE);

// "Display unit" (Settings' Appearance pane) — most Indian sites weigh in
// kg, not tonnes, so a chart/KPI reading "3.4 t" reads as an unfamiliar
// unit to an Indian operator (PLAN §21). This is the general converter that
// setting is built on; the indicator itself always reports kg
// (IndicatorReading.WeightKg) — this only ever touches what's *displayed*.
export const WEIGHT_UNITS = ["kg", "t"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

const KG_PER_UNIT: Record<WeightUnit, number> = { kg: 1, t: 1000 };

/** kg → the given display unit, rounded to `dp` decimals (0 for kg — no
 * fractional kg on a screen meant to be read at a glance; 1 for tonnes,
 * matching the mock's own `toFixed(1)`). */
export const formatWeightIn = (kg: number, unit: WeightUnit): string => {
    const value = kg / KG_PER_UNIT[unit];
    const dp = unit === "kg" ? 0 : 1;
    return `${value.toLocaleString(INDIAN_LOCALE, { minimumFractionDigits: dp, maximumFractionDigits: dp })} ${unit}`;
};

// Ported from the mock's `money()` — `decimalPlaces` is Settings' System
// pane "Amount rounding" (`Formats.AmountDp`), not a fixed 2, so a site
// that bills in whole rupees doesn't see fake paise.
export const formatMoney = (amount: number, decimalPlaces: 0 | 2): string =>
    `₹ ${amount.toLocaleString(INDIAN_LOCALE, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    })}`;
