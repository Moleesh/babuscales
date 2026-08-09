// Indian digit grouping (lakh/crore, not thousands) — every weight, count
// and money figure in the app reads this way, per demo/BabuScale-demo.html.
export const INDIAN_LOCALE = "en-IN";

export const formatWeightKg = (kg: number): string => kg.toLocaleString(INDIAN_LOCALE);
