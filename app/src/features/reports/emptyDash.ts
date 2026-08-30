/** Formats `value` with `format`, or renders `emptyText` (the shared "—"
 * placeholder every Reports cell — weight, charge, net — uses by default)
 * when it's `null`/`undefined`. */
export const emptyDash = <T,>(
    value: T | null | undefined,
    format: (value: T) => string,
    emptyText = "—",
): string => (value === null || value === undefined ? emptyText : format(value));
