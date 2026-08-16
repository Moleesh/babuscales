import { useMemo } from "react";
import type { ReactNode } from "react";

import { useDataPort } from "@db/useDataPort";
import type { LicensingSource } from "@engines/licensing";
import { useSettings } from "@features/settings";

import { LicenseContext } from "./_private/LicenseContext";
import type { LicenseContextValue } from "./_private/LicenseContext";
import { useLicenseActions } from "./_private/useLicenseActions";
import { useLicenseEvaluation } from "./_private/useLicenseEvaluation";
import { useLicenseRecord } from "./_private/useLicenseRecord";

export interface LicenseProviderProps {
    /** The Tauri-vs-noop engine (`@engines/licensing/createLicensingSource`) — same "created once at App level, passed down" shape as TunnelProvider/VerificationServerProvider's own `source` prop. */
    source: LicensingSource;
    children: ReactNode;
}

// Owns the `"license"` config row the same way SettingsProvider owns
// `"settings"` — persistence through the existing generic
// `getConfig`/`saveConfig` commands, no config-specific Tauri command of its
// own (`commands/licensing.rs` is deliberately stateless — see
// its own module doc). What's new here versus Settings: every write to
// `ActivationCode` is validated against the real crypto (`source.evaluate`)
// *before* it's persisted, so a mistyped paste is reported back rather than
// silently saved over a working code.
export const LicenseProvider = ({ source, children }: LicenseProviderProps) => {
    const db = useDataPort();
    const { unlocked } = useSettings();
    const { body, version, setBody, setVersion } = useLicenseRecord(db);
    const { state, loading, setState } = useLicenseEvaluation(source, body);
    const { requestCode, activate, clearActivation } = useLicenseActions({
        db,
        source,
        unlocked,
        body,
        version,
        setBody,
        setVersion,
        setState,
    });

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
