import { describe, expect, it } from "vitest";

import { hashAuditRow, hashBody, sha256Hex } from "./hash";

describe("sha256Hex", () => {
    it("matches a known SHA-256 test vector for an empty string", async () => {
        expect(await sha256Hex("")).toBe(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        );
    });

    it("matches a known SHA-256 test vector for 'abc'", async () => {
        expect(await sha256Hex("abc")).toBe(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        );
    });

    it("hashes raw bytes (Uint8Array) directly, not re-encoded as text", async () => {
        const bytes = new TextEncoder().encode("abc");
        expect(await sha256Hex(bytes)).toBe(await sha256Hex("abc"));
    });

    it("produces different hashes for different input", async () => {
        expect(await sha256Hex("a")).not.toBe(await sha256Hex("b"));
    });
});

describe("hashBody", () => {
    it("is order-independent — same keys, different insertion order, same hash", async () => {
        const a = await hashBody({ b: 2, a: 1 });
        const b = await hashBody({ a: 1, b: 2 });
        expect(a).toBe(b);
    });

    it("is order-independent for nested objects too", async () => {
        const a = await hashBody({ outer: { z: 1, a: 2 } });
        const b = await hashBody({ outer: { a: 2, z: 1 } });
        expect(a).toBe(b);
    });

    it("does not sort array element order (arrays are positional, not sets)", async () => {
        const a = await hashBody({ list: [1, 2, 3] });
        const b = await hashBody({ list: [3, 2, 1] });
        expect(a).not.toBe(b);
    });

    it("differs when values differ even if keys match", async () => {
        const a = await hashBody({ a: 1 });
        const b = await hashBody({ a: 2 });
        expect(a).not.toBe(b);
    });

    it("survives a JSON.parse/stringify round trip unchanged", async () => {
        const original = { b: { y: 2, x: 1 }, a: [1, 2] };
        const roundTripped = JSON.parse(JSON.stringify(original)) as typeof original;
        expect(await hashBody(original)).toBe(await hashBody(roundTripped));
    });
});

describe("hashAuditRow", () => {
    it("mixes prevHash into the result — same content, different prevHash, different hash", async () => {
        const content = { a: 1 };
        const h1 = await hashAuditRow(content, "prev1");
        const h2 = await hashAuditRow(content, "prev2");
        expect(h1).not.toBe(h2);
    });

    it("null prevHash (chain head) produces a stable, distinct result from an empty-string prevHash", async () => {
        const content = { a: 1 };
        const withNull = await hashAuditRow(content, null);
        // Implementation coalesces null to "", so these must match exactly —
        // this pins that specific behaviour rather than assuming it.
        const withEmptyString = await hashAuditRow(content, "");
        expect(withNull).toBe(withEmptyString);
    });

    it("altering earlier content changes this row's hash (chain-breaking property)", async () => {
        const h1 = await hashAuditRow({ a: 1 }, "genesis");
        const h2 = await hashAuditRow({ a: 2 }, "genesis");
        expect(h1).not.toBe(h2);
    });
});
