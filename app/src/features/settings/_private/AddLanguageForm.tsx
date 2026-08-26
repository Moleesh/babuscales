import { useState } from "react";

import { AppModal } from "@components/AppModal";
import type { LanguagePack } from "@i18n/types";
import { EN_STRINGS } from "@i18n/strings";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/LanguagePane.module.css";

export interface AddLanguageFormProps {
    existingCodes: string[];
    unlocked: boolean;
    onCreate: (pack: LanguagePack) => void;
}

// Task: "we will have a button to add more language on create we will copy
// everthing from english" — a brand-new pack starts as a full copy of every
// English string (not an empty `Strings: {}`), so the moment it's created it
// already runs correctly end-to-end; the language-table's own "still
// English" vs. "translated"/"missing" color-coding (LanguageTableCard.tsx)
// then just tracks which of those copied values an admin has actually gone
// in and changed.
//
// Follow-up "can we simplify this or add a pop" — the Code/Name inputs used
// to sit inline in the toolbar, cramped next to the filter and status
// controls; a single button now opens them in an AppModal instead, same
// dialog shape as every other "fill in a couple of fields, then commit"
// flow in Settings (e.g. AdminUnlockModal).
//
// Task: "can we use label and auto generate the key ?" — the Code field
// asked an admin adding, say, "Hindi" to also independently come up with its
// ISO-ish code ("hi") themselves; `slugify` derives one straight from the
// name they already typed, so there's just the one field now. Collisions
// (two names slugifying to the same code, or a name that slugifies to an
// existing pack's code) get a numeric suffix instead of an error, so typing
// a duplicate-sounding name still produces a usable pack rather than a dead
// end.
const slugify = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 12);

const uniqueCode = (base: string, existingCodes: string[]): string => {
    if (!existingCodes.includes(base)) return base;
    let suffix = 2;
    while (existingCodes.includes(`${base}${suffix}`)) suffix += 1;
    return `${base}${suffix}`;
};

// Task: "have a optional json text box to upload the labels if they have
// them handy, missing one in this case will be missing" — pasting a
// `{ "key": "value" }` map here uses those values as-is instead of the
// default full-English-copy seed; any key the JSON leaves out is left out
// of `Strings` entirely (not backfilled from English) so it reads as
// genuinely "missing" (statusOf in LanguageTableCard.tsx) rather than
// looking like an untouched English default — the point is to make gaps in
// a handed-over translation sheet visible, not paper over them.
const parseLabelsJson = (raw: string): Record<string, string> | null => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === "string") out[key] = value;
    }
    return out;
};

export const AddLanguageForm = ({ existingCodes, unlocked, onCreate }: AddLanguageFormProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [labelsJson, setLabelsJson] = useState("");
    const [error, setError] = useState<string | null>(null);

    const close = (): void => {
        setOpen(false);
        setName("");
        setLabelsJson("");
        setError(null);
    };

    const submit = (): void => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError(t("settings.languagePane.addIncomplete"));
            return;
        }
        const trimmedJson = labelsJson.trim();
        let strings = { ...EN_STRINGS };
        if (trimmedJson) {
            const parsed = parseLabelsJson(trimmedJson);
            if (!parsed) {
                setError(t("settings.languagePane.addInvalidJson"));
                return;
            }
            strings = parsed;
        }
        const base = slugify(trimmedName) || "lang";
        const code = uniqueCode(base, existingCodes);
        onCreate({ Code: code, Name: trimmedName, Version: 1, Strings: strings });
        close();
    };

    return (
        <>
            <button type="button" className={styles.addButton} disabled={!unlocked} onClick={() => setOpen(true)}>
                + {t("settings.languagePane.addLanguage")}
            </button>
            <AppModal open={open} title={t("settings.languagePane.addLanguage")} onClose={close} size="small">
                <div className={styles.addModalBody}>
                    <label className={styles.addModalField}>
                        <span>{t("settings.languagePane.addName")}</span>
                        <input
                            autoFocus
                            className={styles.addInput}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && submit()}
                        />
                    </label>
                    <label className={styles.addModalField}>
                        <span>{t("settings.languagePane.addLabelsJson")}</span>
                        <textarea
                            className={styles.addTextarea}
                            value={labelsJson}
                            onChange={(event) => setLabelsJson(event.target.value)}
                            placeholder={t("settings.languagePane.addLabelsJsonPlaceholder")}
                            rows={6}
                        />
                        <span className={styles.hint}>{t("settings.languagePane.addLabelsJsonHint")}</span>
                    </label>
                    {error && <span className={styles.bad}>{error}</span>}
                    <button type="button" className={styles.addButton} onClick={submit}>
                        {t("settings.languagePane.addLanguage")}
                    </button>
                </div>
            </AppModal>
        </>
    );
};
