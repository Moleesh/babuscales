import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useDataPort } from "@db/useDataPort";
import type { LicenseState, LicensingSource } from "@engines/licensing";
import { useSettings } from "@features/settings";

import { LicenseContext } from "./_private/LicenseContext";
import type { LicenseContextValue } from "./_private/LicenseContext";
import { describeLicenseState } from "./describeLicenseState";
import { LICENSE_CONFIG_ID, licenseBodySchema } from "./licenseSchema";
import type { LicenseBody } from "./licenseSchema";

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export interface LicenseProviderProps {
    /** The Tauri-vs-noop engine (`@engines/licensing/createLicensingSource`) — same "created once at App level, passed down" shape as TunnelProvider/VerificationServerProvider's own `source` prop. */
    source: LicensingSource;
    children: ReactNode;
}

// Owns the `"license"` config row the same way SettingsProvider owns
// `"settings"` — persistence through the existing generic
// `getConfig`/`saveConfig` commands, no config-specific Tauri command of its
// own (task #37's `commands/licensing.rs` is deliberately stateless — see
// its own module doc). What's new here versus Settings: every write to
// `ActivationCode` is validated against the real crypto (`source.evaluate`)
// *before* it's persisted, so a mistyped paste is reported back rather than
// silently saved over a working code.
export const LicenseProvider = ({ source, children }: LicenseProviderProps) => {
    const db = useDataPort();
    const { unlocked } = useSettings();
    const [body, setBody] = useState<LicenseBody | null>(null);
    const [version, setVersion] = useState(0);
    const [state, setState] = useState<LicenseState | null>(null);
    const [loading, setLoading] = useState(true);
    const loadedOnce = useRef(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const row = await db.getConfig(LICENSE_CONFIG_ID);
            if (cancelled) return;
            const parsed = row ? licenseBodySchema.safeParse(row.Body) : null;
            if (row && parsed?.success) {
                setBody(parsed.data);
                setVersion(row.Version);
                return;
            }
            // Fresh install, or a foreign/corrupt Body — start a fresh trial
            // rather than brick the app on a parse failure (same reasoning
            // as SettingsProvider's own fallback branch).
            const fresh: LicenseBody = { TrialStartedOn: todayIso(), ActivationCode: null };
            const saved = await db.saveConfig({
                ConfigId: LICENSE_CONFIG_ID,
                ConfigKind: "License",
                Body: fresh,
            });
            if (cancelled) return;
            setBody(fresh);
            setVersion(saved.Version);
        })();
        return () => {
            cancelled = true;
        };
    }, [db]);

    // Re-evaluated whenever the persisted row changes — a fresh Trial
    // reading every render would drift by however long the tab's been open;
    // this only ever reflects what's actually saved.
    useEffect(() => {
        if (!body) return;
        let cancelled = false;
        void source.evaluate(body.TrialStartedOn, body.ActivationCode).then((result) => {
            if (cancelled) return;
            setState(result);
            loadedOnce.current = true;
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [source, body]);

    const requestCode = useCallback((): Promise<string | null> => source.requestCode(), [source]);

    const activate = useCallback(
        async (code: string): Promise<{ ok: boolean; message: string }> => {
            if (!unlocked) return { ok: false, message: "Unlock Settings first." };
            const trimmed = code.trim();
            if (!trimmed) return { ok: false, message: "Enter a code first." };
            if (!body) return { ok: false, message: "Still loading — try again in a moment." };
            const result = await source.evaluate(body.TrialStartedOn, trimmed);
            if (!result) {
                return { ok: false, message: "Not available in this build." };
            }
            if (result.Kind === "Invalid") {
                return { ok: false, message: result.reason };
            }
            const nextBody: LicenseBody = { ...body, ActivationCode: trimmed };
            const saved = await db.saveConfig({
                ConfigId: LICENSE_CONFIG_ID,
                ConfigKind: "License",
                Body: nextBody,
                Version: version + 1,
            });
            setBody(nextBody);
            setVersion(saved.Version);
            setState(result);
            return { ok: true, message: describeLicenseState(result) };
        },
        [unlocked, body, db, version, source],
    );

    const clearActivation = useCallback(async (): Promise<void> => {
        if (!unlocked || !body) return;
        const nextBody: LicenseBody = { ...body, ActivationCode: null };
        const saved = await db.saveConfig({
            ConfigId: LICENSE_CONFIG_ID,
            ConfigKind: "License",
            Body: nextBody,
            Version: version + 1,
        });
        setBody(nextBody);
        setVersion(saved.Version);
        const result = await source.evaluate(nextBody.TrialStartedOn, null);
        setState(result);
    }, [unlocked, body, db, version, source]);

    // TrialExpired/Expired/Invalid all gate — an unreadable or wrong-machine
    // code (Invalid) must not leave the app fully open just because it
    // isn't specifically an expiry; Licensed and Trial (still running)
    // never do. `null` (loading, or the noop engine) never gates either —
    // see LicenseContextValue's own comment.
    const isGated = state !== null && ["TrialExpired", "Expired", "Invalid"].includes(state.Kind);

    const value = useMemo<LicenseContextValue>(
        () => ({ state, loading, isGated, requestCode, activate, clearActivation }),
        [state, loading, isGated, requestCode, activate, clearActivation],
    );

    return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
};
