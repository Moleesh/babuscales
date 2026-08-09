import { useEffect, useState } from "react";

export interface ClockReading {
    time: string;
    day: string;
}

const format = (date: Date): ClockReading => ({
    time: date.toLocaleTimeString("en-IN", { hour12: false }),
    day: date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }),
});

// A ticking wall clock is display behaviour, not business logic — it owns
// its own interval so every screen that shows the header doesn't have to
// re-derive "what time is it" once a second.
export const useClock = (): ClockReading => {
    const [reading, setReading] = useState<ClockReading>(() => format(new Date()));

    useEffect(() => {
        const id = setInterval(() => setReading(format(new Date())), 1000);
        return () => clearInterval(id);
    }, []);

    return reading;
};
