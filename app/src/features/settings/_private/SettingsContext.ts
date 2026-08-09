import { createContext } from "react";

import type { SettingsBody } from "../settingsSchema";

export interface SettingsContextValue {
    settings: SettingsBody;
    /** True until the persisted (or freshly-created) row has loaded — `settings` holds sync defaults until then. */
    loading: boolean;
    unlocked: boolean;
    /** Compares against the stored hash; resolves `true`/`false`, arms the 10-minute auto-lock on success. */
    unlock: (password: string) => Promise<boolean>;
    lock: () => void;
    /** No-op while locked or still loading — every Settings control is expected to check `unlocked` itself (mirrors the mock's `[data-admin]` disable-all) but this is the actual backstop. */
    save: (next: SettingsBody) => Promise<void>;
    changeAdminPassword: (newPassword: string) => Promise<void>;
    /** "Operator on duty" — deliberately NOT gated by `unlocked` (mock's own comment: "appearance is not admin-gated: this is operator comfort"). Empty/whitespace reverts to `DEFAULT_OPERATOR_NAME`. */
    setOperatorName: (name: string) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
