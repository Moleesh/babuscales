import { describe, expect, it } from "vitest";

import { crc32 } from "./crc32";

const bytesOf = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("crc32", () => {
    it("matches the well-known CRC-32 test vector for empty input", () => {
        expect(crc32(new Uint8Array(0))).toBe(0);
    });

    it("matches the well-known CRC-32 test vector for '123456789'", () => {
        // The standard CRC-32 (IEEE 802.3) check value for this ASCII string.
        expect(crc32(bytesOf("123456789"))).toBe(0xcbf43926);
    });

    it("matches the well-known CRC-32 for 'The quick brown fox jumps over the lazy dog'", () => {
        expect(crc32(bytesOf("The quick brown fox jumps over the lazy dog"))).toBe(0x414fa339);
    });

    it("is deterministic for the same input", () => {
        const bytes = bytesOf("hello world");
        expect(crc32(bytes)).toBe(crc32(bytes));
    });

    it("differs for different input", () => {
        expect(crc32(bytesOf("a"))).not.toBe(crc32(bytesOf("b")));
    });

    it("always returns an unsigned 32-bit value", () => {
        const result = crc32(bytesOf("anything"));
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(0xffffffff);
    });
});
