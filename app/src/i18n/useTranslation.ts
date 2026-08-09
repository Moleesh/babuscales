import { useContext } from "react";

import { I18nContext } from "./_private/I18nContext";
import type { I18nContextValue } from "./_private/I18nContext";

export const useTranslation = (): I18nContextValue => {
    const value = useContext(I18nContext);
    if (!value) throw new Error("useTranslation must be used within an I18nProvider");
    return value;
};
