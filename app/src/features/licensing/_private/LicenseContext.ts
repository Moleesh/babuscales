import { createContext } from "react";

import type { LicenseState } from "@engines/licensing";

export interface LicenseContextValue {
    /**
     * `null` while the config row is still loading, or on the noop engine
     * (web demo/memory adapter) where licensing never applies — both mean
     * "don't gate", same "no fake state" rule `@engines/licensing`'s own
     * noop source already documents.
     */
    state: LicenseState | null;
    loading: boolean;
    /** True only for the states that should make the app read-only — see LicenseProvider's own comment on why Invalid is included. */
    isGated: boolean;
    /** The ~15-char request code to send Babulens, or null on the noop engine. Recomputed fresh each call — nothing to cache, it's a pure function of this machine's ID. */
    requestCode: () => Promise<string | null>;
    /** Trims and validates before persisting — a mistyped code is reported back, never saved over a working one. */
    activate: (code: string) => Promise<{ ok: boolean; message: string }>;
    /** Admin-only "start over" — clears a saved code (e.g. after a mistaken paste) so evaluate() falls back to the trial clock. */
    clearActivation: () => Promise<void>;
}

export const LicenseContext = createContext<LicenseContextValue | null>(null);
