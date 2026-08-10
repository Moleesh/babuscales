import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useDataPort } from "@db/useDataPort";
import { setTicketNumberFormat } from "@features/weighing";

import { SettingsContext } from "./_private/SettingsContext";
import type { SettingsContextValue } from "./_private/SettingsContext";
import { DEFAULT_ADMIN_PASSWORD, hashAdminPassword, verifyAdminPassword } from "./adminAuth";
import {
    DEFAULT_CONNECTIONS,
    DEFAULT_FORMATS,
    DEFAULT_INTEGRATIONS,
    DEFAULT_NUMBERING,
    DEFAULT_OPERATOR_NAME,
    DEFAULT_PRINTERS,
    DEFAULT_RULES,
    DEFAULT_STABILITY,
    SETTINGS_CONFIG_ID,
    settingsBodySchema,
} from "./settingsSchema";
import type { SettingsBody } from "./settingsSchema";

// Mock's own admin session: a silent 10-minute auto-lock rather than a
// second login (demo/BabuScale-demo.html's `admTimer`, `10 * 60 * 1000`ms).
const ADMIN_UNLOCK_MS = 10 * 60 * 1000;

// Rendered before the real row has loaded (or on a brand-new install, before
// the default row is created) so nothing downstream has to handle `null` —
// same non-blocking shape as `WeighingScreen`'s own doc list starting empty
// and filling in via effect. An empty admin hash/salt can never verify a
// password, so `unlock()` is safely inert until the real row is in.
const SYNC_DEFAULT_BODY: SettingsBody = {
    Rules: DEFAULT_RULES,
    Stability: DEFAULT_STABILITY,
    Numbering: DEFAULT_NUMBERING,
    Formats: DEFAULT_FORMATS,
    Connections: DEFAULT_CONNECTIONS,
    Printers: DEFAULT_PRINTERS,
    Integrations: DEFAULT_INTEGRATIONS,
    OperatorName: DEFAULT_OPERATOR_NAME,
    AdminPasswordHash: "",
    AdminPasswordSalt: "",
};

export interface SettingsProviderProps {
    children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
    const db = useDataPort();
    const [settings, setSettings] = useState<SettingsBody>(SYNC_DEFAULT_BODY);
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [unlocked, setUnlocked] = useState(false);
    const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const row = await db.getConfig(SETTINGS_CONFIG_ID);
            if (cancelled) return;
            const parsed = row ? settingsBodySchema.safeParse(row.Body) : null;
            if (row && parsed?.success) {
                setSettings(parsed.data);
                setVersion(row.Version);
                setLoading(false);
                return;
            }
            // Fresh install, or a row that failed to parse (shouldn't happen
            // once shipped, but a corrupt/foreign Body must not brick the
            // admin gate) — create/overwrite with real defaults.
            const { Hash, Salt } = await hashAdminPassword(DEFAULT_ADMIN_PASSWORD);
            const body: SettingsBody = {
                ...SYNC_DEFAULT_BODY,
                AdminPasswordHash: Hash,
                AdminPasswordSalt: Salt,
            };
            const saved = await db.saveConfig({
                ConfigId: SETTINGS_CONFIG_ID,
                ConfigKind: "Settings",
                Body: body,
            });
            if (cancelled) return;
            setSettings(body);
            setVersion(saved.Version);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [db]);

    // Pushed to the module-level formatter every time the numbering changes
    // (see @features/weighing's ticketNumber.ts) — the components that call
    // `formatTicketNo` don't otherwise touch Settings.
    useEffect(() => {
        setTicketNumberFormat({
            prefix: settings.Numbering.Prefix,
            width: settings.Numbering.Width,
        });
    }, [settings.Numbering.Prefix, settings.Numbering.Width]);

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
            }
            return ok;
        },
        [settings.AdminPasswordHash, settings.AdminPasswordSalt, armLockTimer],
    );

    // Shared by every write path — `save` gates it on `unlocked`, but
    // `setOperatorName` deliberately doesn't (the mock's own Appearance pane
    // is "operator comfort", not configuration — see SettingsContext.ts).
    const persist = useCallback(
        async (next: SettingsBody): Promise<void> => {
            const row = await db.saveConfig({
                ConfigId: SETTINGS_CONFIG_ID,
                ConfigKind: "Settings",
                Body: next,
                Version: version + 1,
            });
            setSettings(next);
            setVersion(row.Version);
        },
        [db, version],
    );

    const save = useCallback(
        async (next: SettingsBody): Promise<void> => {
            if (!unlocked) return;
            await persist(next);
        },
        [unlocked, persist],
    );

    const changeAdminPassword = useCallback(
        async (newPassword: string): Promise<void> => {
            if (!unlocked) return;
            const { Hash, Salt } = await hashAdminPassword(newPassword);
            await save({ ...settings, AdminPasswordHash: Hash, AdminPasswordSalt: Salt });
        },
        [unlocked, settings, save],
    );

    const setOperatorName = useCallback(
        async (name: string): Promise<void> => {
            const trimmed = name.trim() || DEFAULT_OPERATOR_NAME;
            if (trimmed === settings.OperatorName) return;
            await persist({ ...settings, OperatorName: trimmed });
        },
        [settings, persist],
    );

    const value = useMemo<SettingsContextValue>(
        () => ({
            settings,
            loading,
            unlocked,
            unlock,
            lock,
            save,
            changeAdminPassword,
            setOperatorName,
        }),
        [settings, loading, unlocked, unlock, lock, save, changeAdminPassword, setOperatorName],
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
