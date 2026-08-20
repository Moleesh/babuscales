import { useCallback } from "react";

import { DEFAULT_OPERATOR_NAME } from "../settingsSchema";
import type { SettingsBody, SkinKey, TextScale } from "../settingsSchema";

export interface UseOperatorComfortActions {
    setOperatorName: (name: string) => Promise<void>;
    setSkin: (skin: SkinKey) => Promise<void>;
    setTextScale: (scale: TextScale) => Promise<void>;
}

// Split out of useSettingsActions (over the line budget — docs/CodingStandards.md)
// — the three "operator comfort" setters (SettingsContext.ts's own doc
// comment on why each bypasses `unlocked`), unchanged from the inline
// versions they replace, now sharing `persistWithToast` the same way.
export const useOperatorComfortActions = (
    settings: SettingsBody,
    persistWithToast: (next: SettingsBody) => Promise<void>,
): UseOperatorComfortActions => {
    const setOperatorName = useCallback(
        async (name: string): Promise<void> => {
            const trimmed = name.trim() || DEFAULT_OPERATOR_NAME;
            if (trimmed === settings.OperatorName) return;
            await persistWithToast({ ...settings, OperatorName: trimmed });
        },
        [settings, persistWithToast],
    );

    const setSkin = useCallback(
        async (skin: SkinKey): Promise<void> => {
            if (skin === settings.Skin) return;
            await persistWithToast({ ...settings, Skin: skin });
        },
        [settings, persistWithToast],
    );

    const setTextScale = useCallback(
        async (scale: TextScale): Promise<void> => {
            if (scale === settings.TextScale) return;
            await persistWithToast({ ...settings, TextScale: scale });
        },
        [settings, persistWithToast],
    );

    return { setOperatorName, setSkin, setTextScale };
};
