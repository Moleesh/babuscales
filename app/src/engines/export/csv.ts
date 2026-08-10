// RFC 4180-shaped CSV: a cell containing a comma, quote or newline gets
// wrapped in quotes with embedded quotes doubled; everything else is
// written plain. CRLF line endings — Excel's own native expectation,
// unlike a bare LF which some older Excel versions on Windows have
// historically mis-split.
const escapeCsvCell = (value: string): string =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export const buildCsv = (head: string[], rows: string[][]): string =>
    [head, ...rows].map((line) => line.map(escapeCsvCell).join(",")).join("\r\n");

// The UTF-8 BOM character, U+FEFF.
const UTF8_BOM = String.fromCharCode(0xfeff);

/**
 * A CSV `Blob`, UTF-8 with a leading BOM. The BOM is the deliberate part:
 * without it, Excel opens a UTF-8 CSV assuming the system codepage instead
 * — and this app's reports can carry Tamil text (i18n) and the ₹ symbol,
 * both of which garble under that guess. Plain text editors and every
 * other spreadsheet app ignore a leading BOM harmlessly, so there's no
 * downside to always including it.
 */
export const toCsvBlob = (head: string[], rows: string[][]): Blob =>
    new Blob([UTF8_BOM + buildCsv(head, rows)], { type: "text/csv;charset=utf-8" });
