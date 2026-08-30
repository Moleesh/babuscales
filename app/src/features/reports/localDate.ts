/** Local (not UTC) calendar date as `yyyy-MM-dd`, read off a `Date` already
 * expressed in local time (e.g. `new Date()`, or one built with
 * `new Date(year, month, day)`) — never via `.toISOString()`, which would
 * re-express the same instant in UTC and can shift the day for any positive
 * UTC offset (e.g. IST, UTC+5:30). The single implementation every other
 * "local calendar date" helper in this feature defers to. */
export const toLocalDateOnly = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
