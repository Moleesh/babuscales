import type { JsonRecord } from "@db/types";

// Localisation lives in two places. This file is the shared
// half: the `Localized` shape a field's `Label`/`Help` carries inline, and
// the `LanguagePack` shape uploaded as JSON and stored as a `config` row.
// English is always present and is always the fallback — see resolveLocalized.

/** A value with at least an English form. A field brings its own translations inline. */
export interface Localized {
    en: string;
    [lang: string]: string;
}

/** Extends `JsonRecord` (same reason `TicketBody` does, db/ticketBody.ts) — a pack is saved as a `config` row's `Body` verbatim, see loadLanguagePacks.ts. */
export interface LanguagePack extends JsonRecord {
    Code: string;
    Name: string;
    Version: number;
    /** Only what this pack overrides — a half-translated pack still runs. */
    Strings: Record<string, string>;
}

/** `value[lang]` if the pack carries it, else the English form. Never undefined. */
export const resolveLocalized = (value: Localized, lang: string): string => value[lang] ?? value.en;

/** Same shape as `useTranslation()`'s `t` (I18nContextValue, ./_private/I18nContext.ts) — the
 * single shared alias for threading `t` into a plain helper/component prop that isn't itself a
 * hook. Previously redefined independently in several call sites; import this instead of
 * re-declaring it. */
export type Translate = (key: string) => string;
