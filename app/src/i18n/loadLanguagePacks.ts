import type { DataPort } from "@db/DataPort";

import { languagePackSchema } from "./schemas";
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
