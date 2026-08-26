import type { DataPort } from "@db/DataPort";

import { languagePackSchema } from "./schemas";
import { EN_STRINGS } from "./strings";
import type { LanguagePack } from "./types";

// "A language pack is a row in the database, not a file and not a code
// change" (demo/BabuScales-demo.html's own comment above its PACKS
// fixture) — every pack gets its own `config` row, keyed off its language
// `Code` so a re-upload updates in place rather than duplicating.
// I18nProvider's own doc comment already called this out: "loading is the
// caller's job" — this is that job.
export const languagePackConfigId = (code: string): string => `lang-${code}`;

/** Rows that fail `languagePackSchema` (corrupt, or written by a future version this build doesn't understand) are silently dropped rather than crashing startup — the app still runs in English. */
export const loadLanguagePacks = async (db: DataPort): Promise<LanguagePack[]> => {
    const rows = await db.listConfig({ ConfigKind: "LanguagePack" });
    const packs: LanguagePack[] = [];
    for (const row of rows) {
        const parsed = languagePackSchema.safeParse(row.Body);
        if (parsed.success) packs.push(parsed.data);
    }
    return packs;
};

export const saveLanguagePack = (db: DataPort, pack: LanguagePack): Promise<void> =>
    db
        .saveConfig({
            ConfigId: languagePackConfigId(pack.Code),
            ConfigKind: "LanguagePack",
            Body: pack,
        })
        .then(() => undefined);

// Built-in packs (src/i18n/packs/) ship the app's own baseline translation,
// in source, for real — the upload path is for a site's own custom schema
// field labels or a genuinely new language, not for re-typing what this app
// already ships. A DB-stored pack sharing a `Code` with a built-in one wins
// key-by-key (its own `Strings` merged over the built-in's), the same
// "half-translated pack still runs" fallback `LanguagePack.Strings`'s own
// doc comment already describes one level up — an uploaded override doesn't
// need to repeat every key the built-in pack already has, only the ones an
// admin actually wants to change or add (e.g. a new custom field's label).
//
// Bug: "missing top 2 rows has value??" — `AddLanguageForm`'s "on create we
// copy everything from English" seed (its own doc comment) means a
// brand-new pack's `Strings` starts as a full, literal copy of `EN_STRINGS`
// at that moment, key for key. The old unconditional per-key override above
// then let that untouched copy outrank the shipped built-in translation
// forever, for every key an admin never got around to editing — so when
// `ta.ts` later gained a real translation for a key (`nav.dash`,
// `weigh.paperA4`), a site's own years-old "தமிழ்" pack kept shadowing it
// with its original, never-edited English seed value, and the Language
// table's "Missing" tab (which flags exactly this "still equals English"
// case, see `defaultEnglishFor`/`statusOf` below) had no way to tell that
// apart from a key the admin genuinely wants to keep in English. Only let
// an uploaded/DB value win when it's actually been edited away from what
// English was for that key, or when the built-in pack has no value for that
// key at all (a genuinely custom key, e.g. a per-site field label) — an
// unedited seed copy defers to whatever the built-in pack ships instead of
// freezing it out.
export const mergeLanguagePacks = (
    builtIn: LanguagePack[],
    uploaded: LanguagePack[],
): LanguagePack[] => {
    const byCode = new Map<string, LanguagePack>(builtIn.map((pack) => [pack.Code, pack]));
    for (const pack of uploaded) {
        const base = byCode.get(pack.Code);
        if (!base) {
            byCode.set(pack.Code, pack);
            continue;
        }
        const strings = { ...base.Strings };
        for (const [key, value] of Object.entries(pack.Strings)) {
            if (base.Strings[key] === undefined || value !== EN_STRINGS[key]) strings[key] = value;
        }
        byCode.set(pack.Code, { ...pack, Strings: strings });
    }
    return [...byCode.values()];
};
