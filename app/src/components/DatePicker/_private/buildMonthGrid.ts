// Pure calendar-math helper, pulled out of DatePicker.tsx so that component
// reads as markup/state, not date arithmetic (docs/CodingStandards.md §1 —
// function length/complexity is the readability signal, not raw line count).

export interface CalendarDay {
    /** "YYYY-MM-DD" — same shape as the component's own value contract, so
     * a day cell's identity and the value it produces on click are the same
     * string, never re-derived or reformatted. */
    iso: string;
    day: number;
}

// Sunday-first — matches Chromium's own `<input type="date">` popup under
// the en-IN locale, which is exactly what this component replaces as a
// drop-in replacement for every current consumer. Keeping the same
// week start means nobody has to relearn the grid.
export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** "YYYY-MM-DD" → today at local midnight for that string, or `null` for an
 * empty/unparseable value. Never uses `new Date(isoString)` directly on a
 * bare date (no time component) — that parses as UTC midnight, which shows
 * as the *previous* day once rendered in a negative-UTC-offset timezone
 * (India is +5:30 so this repo hasn't hit it, but the helper stays
 * timezone-safe rather than relying on that). */
export const parseIsoDate = (value: string): { year: number; month: number; day: number } | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, y, m, d] = match;
    return { year: Number(y), month: Number(m) - 1, day: Number(d) };
};

export const toIsoDate = (year: number, month: number, day: number): string =>
    `${year}-${pad2(month + 1)}-${pad2(day)}`;

// A fixed 6-row × 7-col (42-cell) grid — leading/trailing blanks are `null`,
// not clickable padding into the neighbouring month (that's what the
// prev/next-month buttons are for). Always 6 rows regardless of how many
// weeks the visible month actually spans, so paging through months never
// changes the popover's height.
export const buildMonthGrid = (year: number, month: number): (CalendarDay | null)[] => {
    const startOffset = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (CalendarDay | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push({ iso: toIsoDate(year, month, day), day });
    while (cells.length < 42) cells.push(null);
    return cells;
};
