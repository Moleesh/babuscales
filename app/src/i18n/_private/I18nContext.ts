import { createContext } from "react";

import type { LanguagePack } from "../types";

export interface I18nContextValue {
    lang: string;
    setLang: (lang: string) => void;
    /** Resolves a UI string key against the active pack, then English, then the key itself. */
    t: (key: string) => string;
    packs: LanguagePack[];
}

export const I18nContext = createContext<I18nContextValue | null>(null);
