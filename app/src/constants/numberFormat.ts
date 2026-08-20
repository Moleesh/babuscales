// Indian digit grouping (lakh/crore, not thousands) — every weight, count
// and money figure in the app reads this way, per demo/BabuScales-demo.html.
export const INDIAN_LOCALE = "en-IN";

// Every date/time on screen or on a printed slip routes through here so the
// active UI language (i18n's `lang`, "en" or "ta") decides the locale the
// browser formats with — an untranslated `lang` (e.g. a future third pack)
// falls back to the English locale rather than throwing.
const DATE_LOCALE_BY_LANG: Record<string, string> = { en: INDIAN_LOCALE, ta: "ta-IN" };
const dateLocaleFor = (lang: string): string => DATE_LOCALE_BY_LANG[lang] ?? INDIAN_LOCALE;

/** Date only — e.g. report slip date ranges, dashboard "day" chips. */
export const formatDate = (
    value: Date | string,
    lang: string,
    options?: Intl.DateTimeFormatOptions,
): string => new Date(value).toLocaleDateString(dateLocaleFor(lang), options);

/** Date + time — every ticket/master "at"/"updated" timestamp. */
export const formatDateTime = (
    value: Date | string,
    lang: string,
    options?: Intl.DateTimeFormatOptions,
): string => new Date(value).toLocaleString(dateLocaleFor(lang), options);

/** Time only — the header clock's `HH:MM:SS`. */
export const formatTime = (
    value: Date | string,
    lang: string,
    options?: Intl.DateTimeFormatOptions,
): string => new Date(value).toLocaleTimeString(dateLocaleFor(lang), options);

// Settings → Date & time's `Formats.DateFmt` — a fixed pattern the operator
// picked, not the browser's locale default (which is all formatDate above
// ever honoured). Manual, not a date-formatting library: only four fixed
// layouts exist, so a switch is simpler and lighter than pulling one in.
// "MMM" still routes through Intl so `ta` gets a Tamil month name, same as
// every other date on screen — only the day/month/year *arrangement* is
// fixed, not the month name itself.
export const DATE_FORMATS = ["dd MMM yyyy", "dd-MM-yyyy", "dd/MM/yy", "yyyy-MM-dd"] as const;
export type DateFmt = (typeof DATE_FORMATS)[number];

const pad2 = (n: number): string => String(n).padStart(2, "0");

const monthShort = (date: Date, lang: string): string =>
    date.toLocaleDateString(dateLocaleFor(lang), { month: "short" });

/** Date only, in Settings' `Formats.DateFmt` pattern — an unrecognised
 * pattern (e.g. an old settings row saved before this existed) falls back
 * to `formatDate`'s locale-default rendering rather than throwing. */
export const formatDateInFmt = (value: Date | string, lang: string, fmt: string): string => {
    const date = new Date(value);
    const dd = pad2(date.getDate());
    const MM = pad2(date.getMonth() + 1);
    const yyyy = String(date.getFullYear());
    switch (fmt as DateFmt) {
        case "dd MMM yyyy":
            return `${dd} ${monthShort(date, lang)} ${yyyy}`;
        case "dd-MM-yyyy":
            return `${dd}-${MM}-${yyyy}`;
        case "dd/MM/yy":
            return `${dd}/${MM}/${yyyy.slice(-2)}`;
        case "yyyy-MM-dd":
            return `${yyyy}-${MM}-${dd}`;
        default:
            return formatDate(date, lang);
    }
};

/** Time only, in Settings' `Formats.TimeFmt` ("24" or "12"-hour). */
export const formatTimeInFmt = (value: Date | string, lang: string, timeFmt: "24" | "12"): string =>
    new Date(value).toLocaleTimeString(dateLocaleFor(lang), { hour12: timeFmt === "12" });

/** Date + time, each rendered in Settings' own `Formats.DateFmt`/`TimeFmt`
 * — every ticket/print timestamp that has real settings in reach should
 * use this instead of `formatDateTime`'s locale-default rendering. */
export const formatDateTimeInFmt = (
    value: Date | string,
    lang: string,
    dateFmt: string,
    timeFmt: "24" | "12",
): string => `${formatDateInFmt(value, lang, dateFmt)} ${formatTimeInFmt(value, lang, timeFmt)}`;

// Rounded to whole kg — no fractional kg on a screen meant to be read at a
// glance (matches formatWeightIn's `dp = 0` for kg below). Without the
// round, the "Send to lorry" bounce animation's jittery intermediate
// readings showed decimals mid-flight.
export const formatWeightKg = (kg: number): string => Math.round(kg).toLocaleString(INDIAN_LOCALE);

// Same whole-number/grouped-digits rounding as `formatWeightKg`, just
// without the implied "this is a weight" — a schema's own `Formula` fields
// (CalcCard's calc-chain rows, e.g. a Godown schema's NoOfBags/Adjust/
// ExcessShortage) carry no unit of their own to suffix, unlike
// `formatWeightIn`/`formatMoney`.
export const formatPlainNumber = (value: number): string => Math.round(value).toLocaleString(INDIAN_LOCALE);

// "Display unit" (Settings' Appearance pane) — most Indian sites weigh in
// kg, not tonnes, so a chart/KPI reading "3.4 t" reads as an unfamiliar
// unit to an Indian operator. This is the general converter that
// setting is built on; the indicator itself always reports kg
// (IndicatorReading.WeightKg) — this only ever touches what's *displayed*.
export const WEIGHT_UNITS = ["kg", "t"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

/** By request, this is a pure unit-*label* swap, not a kg→tonnes
 * conversion — the indicator only ever reports kg, and every consumer
 * (Dashboard, Reports, print slips, Masters, Weighing) should keep showing
 * that raw number unchanged, just suffixed "kg" or "t" per Settings'
 * Weight display unit. No division, no extra decimal places for tonnes. */
export const formatWeightIn = (kg: number, unit: WeightUnit): string =>
    `${Math.round(kg).toLocaleString(INDIAN_LOCALE)} ${unit}`;

// Ported from the mock's `money()` — `decimalPlaces` is Settings' System
// pane "Amount rounding" (`Formats.AmountDp`), not a fixed 2, so a site
// that bills in whole rupees doesn't see fake paise.
export const formatMoney = (amount: number, decimalPlaces: 0 | 2): string =>
    `₹ ${amount.toLocaleString(INDIAN_LOCALE, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    })}`;
