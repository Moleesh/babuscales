import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { I18nContext } from "./_private/I18nContext";
import { EN_STRINGS } from "./strings";
import type { LanguagePack } from "./types";

export interface I18nProviderProps {
    /** Packs already loaded from `config` (ConfigKind: "LanguagePack") — loading is the caller's job. */
    packs: LanguagePack[];
    initialLang?: string;
    children: ReactNode;
}

// One extra language ships at a time — this provider doesn't
// care how many `packs` it is handed, but the product currently offers one.
export const I18nProvider = ({ packs, initialLang = "en", children }: I18nProviderProps) => {
    const [lang, setLang] = useState(initialLang);
    const activePack = useMemo(
        () => packs.find((pack) => pack.Code === lang) ?? null,
        [packs, lang],
    );

    // A half-translated pack still runs — an untranslated key just falls
    // through to English, never to a blank or an error.
    const t = useCallback(
        (key: string) => activePack?.Strings[key] ?? EN_STRINGS[key] ?? key,
        [activePack],
    );

    // Bug: "when another language is selected it to change the top language
    // also" — see I18nContext.ts's own doc comment. `null` until either side
    // (the top-bar toggle's own `otherPack` fallback in App.tsx, or
    // LanguageTableCard's picker) picks a real code; both already fall back
    // to "the first non-`en` pack" whenever this is still `null` or points at
    // a pack that's since disappeared, so this never needs its own fallback
    // logic here.
    const [otherLangCode, setOtherLangCodeState] = useState<string | null>(null);

    // Edge case: "when i actually have tamil as my language ... and then use
    // the language dropdown to change to something else what happens the
    // application language still stays in tamil" — `lang` (what's actually
    // rendered) and `otherLangCode` (which pack the picker/top-bar toggle
    // points at) used to be fully independent, so re-pointing the picker at
    // a different pack while the app was actively displaying the *old*
    // "other" pack left it stuck showing that now-orphaned pack instead of
    // following the change. Only follows when `lang` isn't `"en"` — picking
    // a different second-language pack while the app is showing English
    // shouldn't switch anything out from under the operator.
    const setOtherLangCode = useCallback((code: string) => {
        setOtherLangCodeState(code);
        setLang((prevLang) => (prevLang !== "en" ? code : prevLang));
    }, []);

    const value = useMemo(
        () => ({ lang, setLang, t, packs, otherLangCode, setOtherLangCode }),
        [lang, t, packs, otherLangCode],
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
