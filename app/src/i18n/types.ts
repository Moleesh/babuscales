// PLAN §8.3 — localisation lives in two places. This file is the shared
// half: the `Localized` shape a field's `Label`/`Help` carries inline, and
// the `LanguagePack` shape uploaded as JSON and stored as a `config` row.
// English is always present and is always the fallback — see resolveLocalized.

/** A value with at least an English form. A field brings its own translations inline (PLAN §8.3). */
export interface Localized {
    en: string;
    [lang: string]: string;
}

export interface LanguagePack {
    Code: string;
    Name: string;
    Version: number;
    /** Only what this pack overrides — a half-translated pack still runs (PLAN §8.3). */
    Strings: Record<string, string>;
}

/** `value[lang]` if the pack carries it, else the English form. Never undefined. */
export const resolveLocalized = (value: Localized, lang: string): string => value[lang] ?? value.en;
