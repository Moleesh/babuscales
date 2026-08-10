import { buildZip } from "./zip";

// XML 1.0 forbids C0 control characters outright, except tab/LF/CR
// (\x09, \x0A, \x0D) — none of this app's own data should ever contain
// one, but a stray character must not hand Excel a workbook it refuses to
// open. Written as \xNN escapes, not a literal character class, so the
// source file carries no raw control bytes.
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

const escapeXml = (value: string): string =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(XML_ILLEGAL_CHARS, "");

/** Spreadsheet column letters for a 0-based index — A, B, … Z, AA, AB, … */
const columnLetter = (index: number): string => {
    let n = index + 1;
    let letters = "";
    while (n > 0) {
        const rem = (n - 1) % 26;
        letters = String.fromCharCode(65 + rem) + letters;
        n = Math.floor((n - 1) / 26);
    }
    return letters;
};

// Every value reaching this function is already a display-formatted
// string (units, thousands separators, the ₹ symbol — see
// engines/print/types.ts's `SlipData` doc comment for the same
// "already formatted, no further rounding here" shape), so every cell is
// written as an inline string (`t="inlineStr"`), never Excel's numeric
// type — writing "1,234" into a numeric cell would either error or
// silently reformat it.
const cellXml = (colIndex: number, rowIndex: number, value: string): string => {
    if (!value) return "";
    const ref = `${columnLetter(colIndex)}${rowIndex}`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
};

const rowXml = (cells: string[], rowIndex: number): string =>
    `<row r="${rowIndex}">${cells.map((cell, i) => cellXml(i, rowIndex, cell)).join("")}</row>`;

const encoder = new TextEncoder();
const textEntry = (name: string, xml: string) => ({ name, data: new Uint8Array(encoder.encode(xml)) });

const CONTENT_TYPES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    "</Types>";

const ROOT_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

const WORKBOOK_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    "</Relationships>";

const workbookXml = (sheetName: string): string =>
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    "</workbook>";

const worksheetXml = (head: string[], rows: string[][]): string => {
    const body = [head, ...rows].map((line, i) => rowXml(line, i + 1)).join("");
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<sheetData>${body}</sheetData>` +
        "</worksheet>"
    );
};

// Excel's own sheet-name rules: 31 characters max, none of \ / ? * [ ] : —
// a report Title ("TICKET REGISTER", "SUMMARY") never hits this today, but
// a hand-rolled writer should not hand Excel a name it will reject.
const sanitizeSheetName = (name: string): string => {
    const cleaned = name.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
    return cleaned || "Sheet1";
};

/**
 * A genuine, minimal `.xlsx` — OOXML SpreadsheetML in a ZIP container —
 * built entirely by hand, no third-party xlsx/zip library. The whole file
 * is five small XML parts (`[Content_Types].xml`, `_rels/.rels`,
 * `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`,
 * `xl/worksheets/sheet1.xml`) stored uncompressed via zip.ts's own
 * hand-rolled ZIP writer — small enough that skipping deflate costs
 * nothing worth a dependency for.
 */
export const toXlsxBlob = (sheetName: string, head: string[], rows: string[][]): Blob =>
    buildZip([
        textEntry("[Content_Types].xml", CONTENT_TYPES),
        textEntry("_rels/.rels", ROOT_RELS),
        textEntry("xl/workbook.xml", workbookXml(sanitizeSheetName(sheetName))),
        textEntry("xl/_rels/workbook.xml.rels", WORKBOOK_RELS),
        textEntry("xl/worksheets/sheet1.xml", worksheetXml(head, rows)),
    ]);
