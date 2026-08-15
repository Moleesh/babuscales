import { useEffect, useState } from "react";

import { formatDate, formatDateInFmt, formatTimeInFmt } from "@constants/numberFormat";
import type { DateFmt } from "@constants/numberFormat";

export interface ClockReading {
    time: string;
    day: string;
}

// Defaults match the pre-Settings-wiring look (24-hour clock, locale-default
// date) — a caller that doesn't have Formats.TimeFmt/DateFmt in reach yet
// (or an old settings row) still gets the same clock it always has.
const DEFAULT_TIME_FMT: "24" | "12" = "24";

const format = (date: Date, lang: string, timeFmt: "24" | "12", dateFmt?: DateFmt): ClockReading => ({
    time: formatTimeInFmt(date, lang, timeFmt),
    // The header's "day chip" — by request, wired to Settings' own DateFmt
    // pattern (same as ticket fields/print slips) rather than a fixed
    // locale-default shape; falls back to formatDate's weekday+short-date
    // rendering when no dateFmt is in reach (matches the pre-wiring look).
    day: dateFmt
        ? formatDateInFmt(date, lang, dateFmt)
        : formatDate(date, lang, { weekday: "short", day: "2-digit", month: "short" }),
});

// A ticking wall clock is display behaviour, not business logic — it owns
// its own interval so every screen that shows the header doesn't have to
// re-derive "what time is it" once a second. `lang` (i18n's active
// language) decides the locale month names render in — Tamil vs English.
// `timeFmt`/`dateFmt` are Settings' own `Formats.TimeFmt`/`Formats.DateFmt`
// (@features/settings) — optional so a caller without settings in reach
// still gets the pre-Settings-wiring defaults.
export const useClock = (
    lang: string,
    timeFmt: "24" | "12" = DEFAULT_TIME_FMT,
    dateFmt?: DateFmt,
): ClockReading => {
    const [reading, setReading] = useState<ClockReading>(() => format(new Date(), lang, timeFmt, dateFmt));

    useEffect(() => {
        const id = setInterval(() => setReading(format(new Date(), lang, timeFmt, dateFmt)), 1000);
        return () => clearInterval(id);
    }, [lang, timeFmt, dateFmt]);

    return reading;
};
