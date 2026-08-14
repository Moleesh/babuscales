import { useCallback } from "react";

import { hashAdminPassword } from "../adminAuth";
import { DEFAULT_OPERATOR_NAME } from "../settingsSchema";
import type { SettingsBody, SkinKey, TextScale } from "../settingsSchema";

export interface UseSettingsActionsArgs {
    settings: SettingsBody;
    unlocked: boolean;
    persist: (next: SettingsBody) => Promise<void>;
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
}: UseSettingsActionsArgs): UseSettingsActions => {
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

    const setSkin = useCallback(
        async (skin: SkinKey): Promise<void> => {
            if (skin === settings.Skin) return;
            await persist({ ...settings, Skin: skin });
        },
        [settings, persist],
    );

    const setTextScale = useCallback(
        async (scale: TextScale): Promise<void> => {
            if (scale === settings.TextScale) return;
            await persist({ ...settings, TextScale: scale });
        },
        [settings, persist],
    );

    const recordDailySummarySent = useCallback(
        async (dateIso: string): Promise<void> => {
            if (dateIso === settings.DailySummary.LastSentDate) return;
            await persist({
                ...settings,
                DailySummary: { ...settings.DailySummary, LastSentDate: dateIso },
            });
        },
        [settings, persist],
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
