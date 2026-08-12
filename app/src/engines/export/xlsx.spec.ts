import { describe, expect, it } from "vitest";

// No public ZIP-reading utility exists in this codebase, and pulling in a
// third-party unzip library just to test our own hand-rolled writer would
// be circular. Structural correctness of the ZIP container itself is
// covered by zip.spec.ts; here we prove toXlsxBlob produces a well-formed
// ZIP (readable back via each entry's local file header) and that the
// worksheet XML embedded in it round-trips the given data safely.
import { toXlsxBlob } from "./xlsx";

// jsdom's Blob has no arrayBuffer()/text(), and `new Response(blob)` was
// found (zip.spec.ts) to silently corrupt binary content by round-tripping
// it through UTF-8 text decoding — FileReader reads the raw bytes back out
// intact.
const blobBytes = (blob: Blob): Promise<Uint8Array> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.onerror = () => reject(new Error(String(reader.error)));
        reader.readAsArrayBuffer(blob);
    });

const readZipEntries = (buf: Uint8Array): { name: string; text: string }[] => {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const entries: { name: string; text: string }[] = [];
    let offset = 0;
    while (offset < buf.length) {
        const sig = view.getUint32(offset, true);
        if (sig !== 0x04034b50) break;
        const nameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);
        const size = view.getUint32(offset + 22, true);
        const nameStart = offset + 30;
        const dataStart = nameStart + nameLen + extraLen;
        const name = new TextDecoder().decode(buf.slice(nameStart, nameStart + nameLen));
        const text = new TextDecoder().decode(buf.slice(dataStart, dataStart + size));
        entries.push({ name, text });
        offset = dataStart + size;
    }
    return entries;
};

describe("toXlsxBlob", () => {
    it("produces a Blob with the zip MIME type", () => {
        const blob = toXlsxBlob("Sheet1", ["A"], [["1"]]);
        expect(blob.type).toBe("application/zip");
    });

    it("contains all five required OOXML parts", async () => {
        const blob = toXlsxBlob("Sheet1", ["A"], [["1"]]);
        const buf = await blobBytes(blob);
        const names = readZipEntries(buf).map((e) => e.name);
        expect(names).toEqual([
            "[Content_Types].xml",
            "_rels/.rels",
            "xl/workbook.xml",
            "xl/_rels/workbook.xml.rels",
            "xl/worksheets/sheet1.xml",
        ]);
    });

    it("worksheet XML contains a row/cell per data value, escaped", async () => {
        const blob = toXlsxBlob("Sheet1", ["Name"], [['A & <B> "C"']]);
        const buf = await blobBytes(blob);
        const sheet = readZipEntries(buf).find((e) => e.name === "xl/worksheets/sheet1.xml");
        expect(sheet).toBeDefined();
        expect(sheet!.text).toContain("A &amp; &lt;B&gt; \"C\"");
        expect(sheet!.text).not.toContain("A & <B>");
    });

    it("empty string cells are omitted (no <c> element written)", async () => {
        const blob = toXlsxBlob("Sheet1", ["A", "B"], [["", "value"]]);
        const buf = await blobBytes(blob);
        const sheet = readZipEntries(buf).find((e) => e.name === "xl/worksheets/sheet1.xml")!;
        // Only one <c> for the header row's two non-empty cells + the one
        // non-empty data cell — none for the empty first data cell.
        const cellCount = (sheet.text.match(/<c /g) ?? []).length;
        expect(cellCount).toBe(3); // "A","B" header + "value"
    });

    it("sheet name is sanitized: illegal characters stripped, truncated to 31 chars", async () => {
        const longName = "a".repeat(40) + "?*[]/\\:";
        const blob = toXlsxBlob(longName, ["A"], []);
        const buf = await blobBytes(blob);
        const workbook = readZipEntries(buf).find((e) => e.name === "xl/workbook.xml")!;
        const match = /name="([^"]*)"/.exec(workbook.text);
        expect(match).not.toBeNull();
        const sheetName = match![1]!;
        expect(sheetName.length).toBeLessThanOrEqual(31);
        expect(sheetName).not.toMatch(/[\\/?*[\]:]/);
    });

    it("falls back to 'Sheet1' when the sanitized name is empty", async () => {
        const blob = toXlsxBlob("???***", ["A"], []);
        const buf = await blobBytes(blob);
        const workbook = readZipEntries(buf).find((e) => e.name === "xl/workbook.xml")!;
        expect(workbook.text).toContain('name="Sheet1"');
    });
});

describe("toXlsxBlob: cell content edge cases", () => {
    it("strips illegal XML control characters from cell values", async () => {
        const blob = toXlsxBlob("Sheet1", ["A"], [["bad\x01char"]]);
        const buf = await blobBytes(blob);
        const sheet = readZipEntries(buf).find((e) => e.name === "xl/worksheets/sheet1.xml")!;
        expect(sheet.text).toContain("badchar");
        expect(sheet.text).not.toContain("\x01");
    });

    it("handles zero data rows (just a header)", async () => {
        const blob = toXlsxBlob("Sheet1", ["A", "B"], []);
        const buf = await blobBytes(blob);
        const sheet = readZipEntries(buf).find((e) => e.name === "xl/worksheets/sheet1.xml")!;
        expect(sheet.text).toContain('<row r="1">');
        expect(sheet.text).not.toContain('<row r="2">');
    });
});
