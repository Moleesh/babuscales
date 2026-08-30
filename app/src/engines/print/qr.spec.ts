import { describe, expect, it } from "vitest";

import { buildQrDataUri } from "./qr";

describe("buildQrDataUri", () => {
    it("returns a base64-encoded SVG data URI", () => {
        const uri = buildQrDataUri("https://example.com/v/doc1");
        expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
        const b64 = uri.slice("data:image/svg+xml;base64,".length);
        const decoded = atob(b64);
        expect(decoded).toContain("<svg");
    });

    it("different input text produces a different data URI", () => {
        const a = buildQrDataUri("https://example.com/v/doc1");
        const b = buildQrDataUri("https://example.com/v/doc2");
        expect(a).not.toBe(b);
    });

    it("handles an empty string without throwing", () => {
        expect(() => buildQrDataUri("")).not.toThrow();
    });

    it("handles a long URL without throwing", () => {
        const longUrl = `https://example.com/v/${"a".repeat(500)}`;
        expect(() => buildQrDataUri(longUrl)).not.toThrow();
    });
});
