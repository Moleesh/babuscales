import { describe, expect, it } from "vitest";

import { crc32 } from "./crc32";
import { buildZip, type ZipEntry } from "./zip";

const encoder = new TextEncoder();

const entry = (name: string, text: string): ZipEntry => ({
    name,
    data: new Uint8Array(encoder.encode(text)),
});

// jsdom's Blob has no arrayBuffer()/text(), and piping it through
// `new Response(blob)` silently corrupts binary content (it round-trips
// through UTF-8 text decoding) — FileReader is the one API in this
// environment that reads a Blob's raw bytes back out intact.
const blobBytes = (blob: Blob): Promise<Uint8Array> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.onerror = () => reject(new Error(String(reader.error)));
        reader.readAsArrayBuffer(blob);
    });

describe("buildZip", () => {
    it("produces a Blob with the ZIP MIME type", () => {
        const blob = buildZip([entry("a.txt", "hello")]);
        expect(blob.type).toBe("application/zip");
    });

    it("local file header starts with the correct signature and fields", async () => {
        const data = "hello";
        const blob = buildZip([entry("a.txt", data)]);
        const buf = await blobBytes(blob);
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

        expect(view.getUint32(0, true)).toBe(0x04034b50); // local file header signature
        expect(view.getUint16(8, true)).toBe(0); // method: stored
        expect(view.getUint32(14, true)).toBe(crc32(encoder.encode(data))); // crc32
        expect(view.getUint32(18, true)).toBe(data.length); // compressed size
        expect(view.getUint32(22, true)).toBe(data.length); // uncompressed size
        expect(view.getUint16(26, true)).toBe("a.txt".length); // name length

        // name bytes immediately follow the fixed 30-byte header
        const nameBytes = buf.slice(30, 30 + "a.txt".length);
        expect(new TextDecoder().decode(nameBytes)).toBe("a.txt");

        // file data immediately follows the name
        const fileBytes = buf.slice(30 + "a.txt".length, 30 + "a.txt".length + data.length);
        expect(new TextDecoder().decode(fileBytes)).toBe(data);
    });

    it("end of central directory signature and counts are correct for multiple entries", async () => {
        const entries = [entry("a.txt", "hello"), entry("b.txt", "world!!")];
        const blob = buildZip(entries);
        const buf = await blobBytes(blob);

        // Find EOCD by its signature (fixed at the very end since no comment is written)
        const eocdOffset = buf.length - 22;
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
        expect(view.getUint16(eocdOffset + 8, true)).toBe(2); // entries on this disk
        expect(view.getUint16(eocdOffset + 10, true)).toBe(2); // total entries
    });

    it("central directory header offset points back to the correct local header", async () => {
        const entries = [entry("a.txt", "hello"), entry("bb.txt", "world!!")];
        const blob = buildZip(entries);
        const buf = await blobBytes(blob);
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

        // First local header is at offset 0; second local header starts after
        // header(30) + name(5) + data(5) = 40 bytes.
        const secondLocalOffset = 30 + "a.txt".length + "hello".length;
        expect(view.getUint32(secondLocalOffset, true)).toBe(0x04034b50);

        // Locate the EOCD to find the central directory offset.
        const eocdOffset = buf.length - 22;
        const centralOffset = view.getUint32(eocdOffset + 16, true);
        // First central directory record signature.
        expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
        // Its local-header-offset field (at +42) should point to entry 0 (offset 0).
        expect(view.getUint32(centralOffset + 42, true)).toBe(0);
    });

    it("handles zero entries without throwing", async () => {
        const blob = buildZip([]);
        const buf = await blobBytes(blob);
        expect(buf.length).toBe(22); // just the EOCD record
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        expect(view.getUint32(0, true)).toBe(0x06054b50);
        expect(view.getUint16(8, true)).toBe(0);
    });

    it("handles an empty-data entry", async () => {
        const blob = buildZip([entry("empty.txt", "")]);
        const buf = await blobBytes(blob);
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        expect(view.getUint32(14, true)).toBe(0); // crc32 of empty data is 0
        expect(view.getUint32(18, true)).toBe(0);
    });
});
