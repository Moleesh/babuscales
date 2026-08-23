import { createContext } from "react";

import type { SettingsBody, SkinKey, TextScale } from "../settingsSchema";

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
    /** Task #51 — Appearance pane's Theme picker. Same "operator comfort" reasoning as `setOperatorName`, deliberately NOT gated by `unlocked`. */
    setSkin: (skin: SkinKey) => Promise<void>;
    setTextScale: (scale: TextScale) => Promise<void>;
    /** Task #45 — records that today's scheduled summary went out (sent or failed, one attempt either way), so `DailySummarySync`/`DailySummaryCard` don't re-send it. Bookkeeping, not admin configuration — deliberately NOT gated by `unlocked`, same reasoning as `setOperatorName`: this can fire while Settings sits locked, same as any other automatic background behaviour in this app. */
    recordDailySummarySent: (dateIso: string) => Promise<void>;
    /** Re-reads the settings row from the DB, replacing in-memory state — used after `importBackup` swaps the whole backing store out from under whatever Settings had loaded before the restore. */
    reload: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
