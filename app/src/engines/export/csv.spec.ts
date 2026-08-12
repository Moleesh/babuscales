import { describe, expect, it } from "vitest";

import { buildCsv, toCsvBlob } from "./csv";

describe("buildCsv", () => {
    it("plain cells are written unquoted, joined by commas", () => {
        expect(buildCsv(["A", "B"], [["1", "2"]])).toBe("A,B\r\n1,2");
    });

    it("joins head and rows with CRLF, not bare LF", () => {
        const csv = buildCsv(["A"], [["1"], ["2"]]);
        expect(csv).toBe("A\r\n1\r\n2");
        expect(csv).not.toContain("\n\n");
    });

    it("a cell containing a comma is quoted", () => {
        expect(buildCsv(["A"], [["a,b"]])).toBe('A\r\n"a,b"');
    });

    it("a cell containing a double quote is quoted and the quote doubled", () => {
        expect(buildCsv(["A"], [['say "hi"']])).toBe('A\r\n"say ""hi"""');
    });

    it("a cell containing a newline is quoted", () => {
        expect(buildCsv(["A"], [["line1\nline2"]])).toBe('A\r\n"line1\nline2"');
    });

    it("a cell containing a bare CR is quoted", () => {
        expect(buildCsv(["A"], [["a\rb"]])).toBe('A\r\n"a\rb"');
    });

    it("a cell with no special characters is left completely plain", () => {
        expect(buildCsv(["A"], [["plain text 123"]])).toBe("A\r\nplain text 123");
    });

    it("empty rows array produces just the header line", () => {
        expect(buildCsv(["A", "B"], [])).toBe("A,B");
    });

    it("empty string cell stays empty, unquoted", () => {
        expect(buildCsv(["A"], [[""]])).toBe("A\r\n");
    });
});

describe("toCsvBlob", () => {
    it("produces a Blob with the correct MIME type", () => {
        const blob = toCsvBlob(["A"], [["1"]]);
        expect(blob.type).toBe("text/csv;charset=utf-8");
    });

    it("prepends the UTF-8 BOM before the CSV text", async () => {
        // `.text()`/`Response(blob).text()` decode as UTF-8 and strip a
        // leading BOM per spec — reading the raw bytes via FileReader is
        // the only way to actually observe it's there in the blob's content.
        const blob = toCsvBlob(["A"], [["1"]]);
        const buf: ArrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(new Error(String(reader.error)));
            reader.readAsArrayBuffer(blob);
        });
        const bytes = new Uint8Array(buf);
        // UTF-8 encoding of U+FEFF is the 3-byte sequence EF BB BF.
        expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
        const rest = new TextDecoder().decode(bytes.slice(3));
        expect(rest).toBe("A\r\n1");
    });
});
