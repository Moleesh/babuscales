import { useContext } from "react";

import { SettingsContext } from "./_private/SettingsContext";
import type { SettingsContextValue } from "./_private/SettingsContext";

export const useSettings = (): SettingsContextValue => {
    const value = useContext(SettingsContext);
    if (!value) throw new Error("useSettings must be used within a SettingsProvider");
    return value;
};
