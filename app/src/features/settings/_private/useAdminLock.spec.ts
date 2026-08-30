import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashAdminPassword } from "../adminAuth";
import { SYNC_DEFAULT_BODY } from "./loadSettingsRow";
import type { SettingsBody } from "../settingsSchema";
import { useAdminLock } from "./useAdminLock";

const ADMIN_UNLOCK_MS = 10 * 60 * 1000;

const makeSettings = async (password: string): Promise<SettingsBody> => {
    const { Hash, Salt } = await hashAdminPassword(password);
    return { ...SYNC_DEFAULT_BODY, AdminPasswordHash: Hash, AdminPasswordSalt: Salt };
};

describe("useAdminLock", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("starts locked", async () => {
        const settings = await makeSettings("1234");
        const { result } = renderHook(() => useAdminLock(settings, vi.fn()));
        expect(result.current.unlocked).toBe(false);
    });

    it("unlock() with the correct password unlocks", async () => {
        const settings = await makeSettings("1234");
        const persistPatch = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useAdminLock(settings, persistPatch));

        let ok = false;
        await act(async () => {
            ok = await result.current.unlock("1234");
        });
        expect(ok).toBe(true);
        expect(result.current.unlocked).toBe(true);
    });

    it("unlock() with the wrong password stays locked", async () => {
        const settings = await makeSettings("1234");
        const { result } = renderHook(() => useAdminLock(settings, vi.fn()));

        let ok = true;
        await act(async () => {
            ok = await result.current.unlock("wrong");
        });
        expect(ok).toBe(false);
        expect(result.current.unlocked).toBe(false);
    });

    it("lock() re-locks an unlocked session immediately", async () => {
        const settings = await makeSettings("1234");
        const { result } = renderHook(() => useAdminLock(settings, vi.fn()));

        await act(async () => {
            await result.current.unlock("1234");
        });
        expect(result.current.unlocked).toBe(true);

        act(() => {
            result.current.lock();
        });
        expect(result.current.unlocked).toBe(false);
    });

    it("auto-locks after the 10-minute idle timeout", async () => {
        const settings = await makeSettings("1234");
        const { result } = renderHook(() => useAdminLock(settings, vi.fn()));

        await act(async () => {
            await result.current.unlock("1234");
        });
        expect(result.current.unlocked).toBe(true);

        act(() => {
            vi.advanceTimersByTime(ADMIN_UNLOCK_MS - 1);
        });
        expect(result.current.unlocked).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current.unlocked).toBe(false);
    });

    it("a second unlock() call while already unlocked re-arms the timer without re-verifying the password", async () => {
        const settings = await makeSettings("1234");
        const { result } = renderHook(() => useAdminLock(settings, vi.fn()));

        await act(async () => {
            await result.current.unlock("1234");
        });

        // Run the clock most of the way to the timeout, then "touch" the
        // session with a second unlock call using a bogus password — it
        // must still return true (already-unlocked fast path) and push the
        // deadline back out, rather than verifying (and rejecting) it.
        act(() => {
            vi.advanceTimersByTime(ADMIN_UNLOCK_MS - 1000);
        });
        let ok = false;
        await act(async () => {
            ok = await result.current.unlock("totally-wrong-password");
        });
        expect(ok).toBe(true);
        expect(result.current.unlocked).toBe(true);

        // Original deadline (1000ms after the last advance) has now passed,
        // but the re-arm should have pushed it out another full window.
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current.unlocked).toBe(true);
    });

    it("successful legacy-hash login upgrades the stored hash to PBKDF2 via persistPatch", async () => {
        // Real timers here: the legacy-upgrade path awaits crypto.subtle
        // (a real microtask chain, not timer-driven), which fake timers'
        // vi.runAllTimersAsync doesn't reliably flush.
        vi.useRealTimers();
        // Legacy hash: sha256Hex(salt + ":" + password), no pbkdf2$ prefix.
        const { sha256Hex } = await import("@db/hash");
        const salt = "legacysalt";
        const legacyHash = await sha256Hex(`${salt}:1234`);
        const settings: SettingsBody = { ...SYNC_DEFAULT_BODY, AdminPasswordHash: legacyHash, AdminPasswordSalt: salt };

        const persistPatch = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useAdminLock(settings, persistPatch));

        await act(async () => {
            await result.current.unlock("1234");
        });
        expect(result.current.unlocked).toBe(true);

        await vi.waitFor(() => expect(persistPatch).toHaveBeenCalledTimes(1));
        const mutator = persistPatch.mock.calls[0]?.[0] as (s: SettingsBody) => SettingsBody;
        const patched = mutator(settings);
        expect(patched.AdminPasswordHash.startsWith("pbkdf2$")).toBe(true);
        expect(patched.AdminPasswordHash).not.toBe(legacyHash);
    });

    it("wrong password against a legacy hash does not unlock or upgrade", async () => {
        const { sha256Hex } = await import("@db/hash");
        const salt = "legacysalt";
        const legacyHash = await sha256Hex(`${salt}:1234`);
        const settings: SettingsBody = { ...SYNC_DEFAULT_BODY, AdminPasswordHash: legacyHash, AdminPasswordSalt: salt };

        const persistPatch = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useAdminLock(settings, persistPatch));

        await act(async () => {
            await result.current.unlock("wrong");
        });
        expect(result.current.unlocked).toBe(false);
        expect(persistPatch).not.toHaveBeenCalled();
    });
});
