import { useCallback, useEffect, useRef, useState } from "react";

import { hashAdminPassword, isLegacyAdminHash, verifyAdminPassword } from "../adminAuth";
import type { SettingsBody } from "../settingsSchema";

// Mock's own admin session: a silent 10-minute auto-lock rather than a
// second login (demo/BabuScales-demo.html's `admTimer`, `10 * 60 * 1000`ms).
const ADMIN_UNLOCK_MS = 10 * 60 * 1000;

export interface UseAdminLock {
    unlocked: boolean;
    lock: () => void;
    unlock: (password: string) => Promise<boolean>;
}

// Split out of SettingsProvider (over the line budget — docs/CodingStandards.md)
// — the admin unlock/auto-lock timer, unchanged from the inline version it
// replaces. Takes the live `settings` object (not just the hash/salt) so the
// closure always checks the current password, not a stale one from render.
export const useAdminLock = (
    settings: SettingsBody,
    persistPatch: (mutator: (current: SettingsBody) => SettingsBody) => Promise<void>,
): UseAdminLock => {
    const [unlocked, setUnlocked] = useState(false);
    const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lock = useCallback(() => {
        if (lockTimer.current) clearTimeout(lockTimer.current);
        lockTimer.current = null;
        setUnlocked(false);
    }, []);

    const armLockTimer = useCallback(() => {
        if (lockTimer.current) clearTimeout(lockTimer.current);
        lockTimer.current = setTimeout(() => setUnlocked(false), ADMIN_UNLOCK_MS);
    }, []);

    useEffect(
        () => () => {
            if (lockTimer.current) clearTimeout(lockTimer.current);
        },
        [],
    );

    const unlock = useCallback(
        async (password: string): Promise<boolean> => {
            const ok = await verifyAdminPassword(
                password,
                settings.AdminPasswordHash,
                settings.AdminPasswordSalt,
            );
            if (ok) {
                setUnlocked(true);
                armLockTimer();
                // Bug: "admin password 1234 is not working" — a row still on
                // the pre-PBKDF2 hash just proved it knows the real password
                // via the legacy fallback (adminAuth.ts's verifyAdminPassword);
                // upgrade it to PBKDF2 now so it isn't left on the weaker
                // scheme indefinitely. Best-effort — a failed persist here
                // must not undo the unlock that already succeeded.
                if (isLegacyAdminHash(settings.AdminPasswordHash)) {
                    void hashAdminPassword(password).then(({ Hash, Salt }) =>
                        persistPatch((current) => ({ ...current, AdminPasswordHash: Hash, AdminPasswordSalt: Salt })),
                    );
                }
            }
            return ok;
        },
        [settings.AdminPasswordHash, settings.AdminPasswordSalt, armLockTimer, persistPatch],
    );

    return { unlocked, lock, unlock };
};
