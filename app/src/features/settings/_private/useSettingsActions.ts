import { useCallback } from "react";

import { useToast } from "@components/Toast";
import { useTranslation } from "@i18n/useTranslation";

import { hashAdminPassword } from "../adminAuth";
import type { SettingsBody, SkinKey, TextScale } from "../settingsSchema";
import { useOperatorComfortActions } from "./useOperatorComfortActions";

export interface UseSettingsActionsArgs {
    settings: SettingsBody;
    unlocked: boolean;
    persist: (next: SettingsBody) => Promise<void>;
    persistPatch: (mutator: (current: SettingsBody) => SettingsBody) => Promise<void>;
}

export interface UseSettingsActions {
    save: (next: SettingsBody) => Promise<void>;
    changeAdminPassword: (newPassword: string) => Promise<void>;
    setOperatorName: (name: string) => Promise<void>;
    setSkin: (skin: SkinKey) => Promise<void>;
    setTextScale: (scale: TextScale) => Promise<void>;
    recordDailySummarySent: (dateIso: string) => Promise<void>;
}

// Split out of SettingsProvider (over the line budget — docs/CodingStandards.md)
// — every write-path callback except `unlock`/`lock` (see useAdminLock),
// unchanged from the inline versions they replace. `setOperatorName`/
// `setSkin`/`setTextScale`/`recordDailySummarySent` all bypass `unlocked` —
// see SettingsContext.ts's own doc comment on why each is "operator
// comfort" or automatic bookkeeping rather than admin configuration.
export const useSettingsActions = ({
    settings,
    unlocked,
    persist,
    persistPatch,
}: UseSettingsActionsArgs): UseSettingsActions => {
    const { showToast } = useToast();
    const { t } = useTranslation();
    // Every write below goes through this, so the "Saved" toast (task: a
    // small self-clearing notification on every save) only has to be
    // written once rather than repeated after each `persist` call.
    const persistWithToast = useCallback(
        async (next: SettingsBody): Promise<void> => {
            await persist(next);
            showToast(t("components.toast.saved"));
        },
        [persist, showToast, t],
    );

    const save = useCallback(
        async (next: SettingsBody): Promise<void> => {
            if (!unlocked) return;
            await persistWithToast(next);
        },
        [unlocked, persistWithToast],
    );

    const changeAdminPassword = useCallback(
        async (newPassword: string): Promise<void> => {
            if (!unlocked) return;
            const { Hash, Salt } = await hashAdminPassword(newPassword);
            await save({ ...settings, AdminPasswordHash: Hash, AdminPasswordSalt: Salt });
        },
        [unlocked, settings, save],
    );

    const { setOperatorName, setSkin, setTextScale } = useOperatorComfortActions(settings, persistWithToast);

    // Read-latest-then-patch (useSettingsRecord's `persistPatch`), not
    // `persist` off the `settings` this hook closed over: `DailySummarySync`
    // (App.tsx) can call this minutes after its own effect last re-ran, from
    // the far side of an SMTP send that can itself take seconds — writing a
    // whole stale `settings` snapshot at that point would silently discard
    // any unrelated admin edit that landed in between. Patching just this
    // one field on top of a fresh DB read can't clobber it.
    const recordDailySummarySent = useCallback(
        async (dateIso: string): Promise<void> => {
            await persistPatch((current) => {
                if (dateIso === current.DailySummary.LastSentDate) return current;
                return { ...current, DailySummary: { ...current.DailySummary, LastSentDate: dateIso } };
            });
        },
        [persistPatch],
    );

    return {
        save,
        changeAdminPassword,
        setOperatorName,
        setSkin,
        setTextScale,
        recordDailySummarySent,
    };
};
