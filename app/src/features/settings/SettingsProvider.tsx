import { useMemo } from "react";
import type { ReactNode } from "react";

import { useDataPort } from "@db/useDataPort";

import { SettingsContext } from "./_private/SettingsContext";
import type { SettingsContextValue } from "./_private/SettingsContext";
import { useAdminLock } from "./_private/useAdminLock";
import { useSettingsActions } from "./_private/useSettingsActions";
import { useSettingsRecord } from "./_private/useSettingsRecord";

export interface SettingsProviderProps {
    children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
    const db = useDataPort();
    const { settings, loading, persist, persistPatch, reload } = useSettingsRecord(db);
    const { unlocked, lock, unlock } = useAdminLock(settings, persistPatch);
    const { save, changeAdminPassword, setOperatorName, setSkin, setTextScale, recordDailySummarySent } =
        useSettingsActions({ settings, unlocked, persist, persistPatch });

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
            setSkin,
            setTextScale,
            recordDailySummarySent,
            reload,
        }),
        [
            settings,
            loading,
            unlocked,
            unlock,
            lock,
            save,
            changeAdminPassword,
            setOperatorName,
            setSkin,
            setTextScale,
            recordDailySummarySent,
            reload,
        ],
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
