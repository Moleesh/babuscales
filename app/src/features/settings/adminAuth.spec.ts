import { describe, expect, it } from "vitest";

import { sha256Hex } from "@db/hash";

import {
    DEFAULT_ADMIN_PASSWORD,
    hashAdminPassword,
    isLegacyAdminHash,
    verifyAdminPassword,
} from "./adminAuth";

describe("hashAdminPassword / verifyAdminPassword (PBKDF2)", () => {
    it("round-trips: a hash produced by hashAdminPassword verifies with the same password", async () => {
        const { Hash, Salt } = await hashAdminPassword(DEFAULT_ADMIN_PASSWORD);
        expect(Hash.startsWith("pbkdf2$")).toBe(true);
        await expect(verifyAdminPassword(DEFAULT_ADMIN_PASSWORD, Hash, Salt)).resolves.toBe(true);
    });

    it("rejects the wrong password against a valid hash", async () => {
        const { Hash, Salt } = await hashAdminPassword("correct-horse");
        await expect(verifyAdminPassword("wrong-password", Hash, Salt)).resolves.toBe(false);
    });

    it("a fixed salt reproduces the same hash deterministically", async () => {
        const salt = "aabbccddeeff00112233445566778899";
        const a = await hashAdminPassword("hunter2", salt);
        const b = await hashAdminPassword("hunter2", salt);
        expect(a.Hash).toBe(b.Hash);
        expect(a.Salt).toBe(salt);
    });

    it("stores the iteration count in the hash string as pbkdf2$<iterations>$<hex>", async () => {
        const { Hash } = await hashAdminPassword("x");
        const parts = Hash.split("$");
        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe("pbkdf2");
        expect(Number(parts[1])).toBeGreaterThan(0);
        expect(parts[2]).toMatch(/^[0-9a-f]+$/);
    });
});

describe("verifyAdminPassword edge cases", () => {
    it("false when hash or salt is empty", async () => {
        await expect(verifyAdminPassword("1234", "", "salt")).resolves.toBe(false);
        await expect(verifyAdminPassword("1234", "hash", "")).resolves.toBe(false);
        await expect(verifyAdminPassword("1234", "", "")).resolves.toBe(false);
    });

    it("false for a pbkdf2-prefixed hash with a non-numeric iteration count", async () => {
        await expect(verifyAdminPassword("1234", "pbkdf2$notanumber$abcd", "salt")).resolves.toBe(false);
    });

    it("false for a pbkdf2-prefixed hash missing its hex segment", async () => {
        await expect(verifyAdminPassword("1234", "pbkdf2$210000$", "salt")).resolves.toBe(false);
    });

    // Regression: "admin password 1234 is not working" — a pre-existing
    // install's Settings row still on the legacy single-round sha256Hex
    // scheme must keep verifying, not be rejected just for lacking the
    // pbkdf2$ prefix.
    it("legacy fallback: verifies an old sha256Hex(salt + ':' + password) hash", async () => {
        const salt = "legacysalt";
        const legacyHash = await sha256Hex(`${salt}:${DEFAULT_ADMIN_PASSWORD}`);
        await expect(verifyAdminPassword(DEFAULT_ADMIN_PASSWORD, legacyHash, salt)).resolves.toBe(true);
    });

    it("legacy fallback rejects the wrong password too", async () => {
        const salt = "legacysalt";
        const legacyHash = await sha256Hex(`${salt}:${DEFAULT_ADMIN_PASSWORD}`);
        await expect(verifyAdminPassword("wrong", legacyHash, salt)).resolves.toBe(false);
    });
});

describe("isLegacyAdminHash", () => {
    it("true for a legacy (non-pbkdf2-prefixed) hash", () => {
        expect(isLegacyAdminHash("deadbeef")).toBe(true);
    });

    it("false for a pbkdf2-prefixed hash", () => {
        expect(isLegacyAdminHash("pbkdf2$210000$deadbeef")).toBe(false);
    });

    it("false for an empty hash (falsy guard)", () => {
        expect(isLegacyAdminHash("")).toBe(false);
    });
});
