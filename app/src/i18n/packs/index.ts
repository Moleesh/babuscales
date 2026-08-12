import type { LanguagePack } from "../types";
import { TA_PACK } from "./ta";

// Every language this app ships translated source for, keyed by `Code` —
// always present, regardless of what's in the database. A site's uploaded
// pack (Settings → Fields & language) overrides a built-in one of the same
// `Code` string-for-string (mergeLanguagePacks, ../loadLanguagePacks.ts);
// it does not need to re-supply every key the built-in one already has.
export const BUILT_IN_PACKS: LanguagePack[] = [TA_PACK];
