import { useEffect, useState } from "react";

import { formatDate, formatTimeInFmt } from "@constants/numberFormat";

export interface ClockReading {
    time: string;
    day: string;
}

// Default matches the pre-Settings-wiring look (24-hour) — a caller that
// doesn't have Formats.TimeFmt in reach yet (or an old settings row) still
// gets the same clock it always has.
const DEFAULT_TIME_FMT: "24" | "12" = "24";

const format = (date: Date, lang: string, timeFmt: "24" | "12"): ClockReading => ({
    time: formatTimeInFmt(date, lang, timeFmt),
    // The header's "day chip" (weekday + short date) is a distinct display
    // from Settings' DateFmt pattern — it's always this shape, not one of
    // the four DateFmt layouts, so it keeps using formatDate's locale
    // default rather than routing through formatDateInFmt.
    day: formatDate(date, lang, { weekday: "short", day: "2-digit", month: "short" }),
});

// A ticking wall clock is display behaviour, not business logic — it owns
// its own interval so every screen that shows the header doesn't have to
// re-derive "what time is it" once a second. `lang` (i18n's active
// language) decides the locale month names render in — Tamil vs English.
// `timeFmt` is Settings' own `Formats.TimeFmt` (@features/settings) —
// optional so a caller without settings in reach still gets the
// pre-Settings-wiring default (24-hour).
export const useClock = (lang: string, timeFmt: "24" | "12" = DEFAULT_TIME_FMT): ClockReading => {
    const [reading, setReading] = useState<ClockReading>(() => format(new Date(), lang, timeFmt));

    useEffect(() => {
        const id = setInterval(() => setReading(format(new Date(), lang, timeFmt)), 1000);
        return () => clearInterval(id);
    }, [lang, timeFmt]);

    return reading;
};
