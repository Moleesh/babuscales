import type { ReactNode } from "react";

import { resolveLocalized } from "@i18n/types";
import type { Localized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./Field.module.css";

export interface FieldProps {
    /** Matches the `htmlFor`/`id` pair so the label focuses the input. */
    id: string;
    label: Localized;
    /** Present on search fields (PLAN §8.2) — shows the ⌕ glass with this as its tooltip. */
    searchTitle?: Localized;
    /** True when this value came back from a recalled ticket rather than fresh entry. */
    recalled?: boolean;
    children: ReactNode;
}

// The wrapper every field in a form uses: label + optional master-search
// glass + optional "recalled" badge, around whatever input the caller
// renders as children. Ported from the mock's ".f"/".lbl"/".mst"/".tag" markup.
export const Field = ({ id, label, searchTitle, recalled, children }: FieldProps) => {
    const { lang, t } = useTranslation();

    return (
        <div className={`${styles.f} ${recalled ? styles.recalled : ""}`}>
            <label className={styles.lbl} htmlFor={id}>
                <span>{resolveLocalized(label, lang)}</span>
                {searchTitle && (
                    <span className={styles.mst} title={resolveLocalized(searchTitle, lang)}>
                        ⌕
                    </span>
                )}
                {recalled && <span className={styles.tag}>{t("recalled")}</span>}
            </label>
            {children}
        </div>
    );
};
