import { useEffect, useState } from "react";

import { formatDate, formatTime } from "@constants/numberFormat";

export interface ClockReading {
    time: string;
    day: string;
}

const format = (date: Date, lang: string): ClockReading => ({
    time: formatTime(date, lang, { hour12: false }),
    day: formatDate(date, lang, { weekday: "short", day: "2-digit", month: "short" }),
});

// A ticking wall clock is display behaviour, not business logic — it owns
// its own interval so every screen that shows the header doesn't have to
// re-derive "what time is it" once a second. `lang` (i18n's active
// language) decides the locale month names render in — Tamil vs English.
export const useClock = (lang: string): ClockReading => {
    const [reading, setReading] = useState<ClockReading>(() => format(new Date(), lang));

    useEffect(() => {
        const id = setInterval(() => setReading(format(new Date(), lang)), 1000);
        return () => clearInterval(id);
    }, [lang]);

    return reading;
};
