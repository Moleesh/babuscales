import { BUILT_IN_PACKS } from "@i18n/packs";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/LanguagePane.module.css";
import { LanguageTableCard } from "./LanguageTableCard";
import { useSettings } from "../useSettings";

// Task: "delete needs confirmation" follow-up — a built-in pack (ships in
// source, `@i18n/packs`) can't actually be removed even if its `config`
// override row is deleted (`mergeLanguagePacks` re-derives it from source
// every load), so LanguageTableCard needs to know which codes those are to
// keep the delete icon from offering something that wouldn't do what it
// says.
const BUILT_IN_CODES = BUILT_IN_PACKS.map((pack) => pack.Code);

export interface LanguagePaneProps {
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
    onDeleteLanguagePack: (code: string) => Promise<void>;
}

// Task: "for language lets change it to something like this ... we will
// have a button to add more language on create we will copy everything
// from english, we can also select the second language here" — replaced the
// old upload-a-.lang-file card (LanguagePacksCard, still in this directory
// but no longer wired anywhere) with an inline-editable Key | English |
// [picked language] table (LanguageTableCard.tsx). `useTranslation().packs`
// is the live, already-loaded list (App.tsx loads it from `config` rows at
// startup); `onAddLanguagePack` is how a new or edited one gets persisted —
// see App.tsx's `addLanguagePack`.
export const LanguagePane = ({ onAddLanguagePack, onDeleteLanguagePack }: LanguagePaneProps) => {
    const { packs, otherLangCode, setOtherLangCode } = useTranslation();
    const { unlocked } = useSettings();

    return (
        <div className={styles.grid}>
            <LanguageTableCard
                packs={packs}
                unlocked={unlocked}
                onAddLanguagePack={onAddLanguagePack}
                onDeleteLanguagePack={onDeleteLanguagePack}
                builtInCodes={BUILT_IN_CODES}
                selectedCode={otherLangCode}
                onSelectCode={setOtherLangCode}
            />
        </div>
    );
};
