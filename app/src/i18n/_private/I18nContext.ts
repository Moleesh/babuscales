import { createContext } from "react";

import type { LanguagePack } from "../types";

export interface I18nContextValue {
    lang: string;
    setLang: (lang: string) => void;
    /** Resolves a UI string key against the active pack, then English, then the key itself. */
    t: (key: string) => string;
    packs: LanguagePack[];
    /** Bug: "when another language is selected it to change the top language
     * also" — which non-English pack the top-bar toggle chip (App.tsx's
     * `otherPack`) offers to switch to. Used to just be "whichever non-`en`
     * pack happens to be first in `packs`"; now it's whichever one Settings
     * → Language's own picker (LanguageTableCard.tsx) last had selected, so
     * the two stay in sync instead of drifting once there's more than one
     * installed pack. Lives here (not Shell-local state) since both the top
     * bar and the Language pane sit on opposite sides of `Shell` and this is
     * the shared ancestor already owning every other language concern. */
    otherLangCode: string | null;
    setOtherLangCode: (code: string) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
