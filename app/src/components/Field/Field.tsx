import type { ReactNode } from "react";

import { Tooltip } from "@components/Tooltip";
import { resolveLocalized } from "@i18n/types";
import type { Localized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/Field.module.css";

export interface FieldProps {
    /** Matches the `htmlFor`/`id` pair so the label focuses the input. */
    id: string;
    /**
     * A plain string is expected to have already gone through `t()` at the call
     * site — the normal case for this app's own static UI chrome, which lives in
     * `strings.ts`/`ta.ts` like everything else so an uploaded language pack can
     * override it. `Localized` is for genuinely per-install, dynamic data — a
     * site's own custom schema field labels (`Field.Label`, entered per-field,
     * per-language, directly on the field) — where there is no static key to
     * route through `t()` in the first place.
     */
    label: string | Localized;
    /** Present on search fields — shows the ⌕ glass with this as its tooltip. Same string-vs-Localized split as `label`. */
    searchTitle?: string | Localized | undefined;
    /** True when this value came back from a recalled ticket rather than fresh entry. */
    recalled?: boolean | undefined;
    children: ReactNode;
}

const resolveLabel = (value: string | Localized, lang: string): string =>
    typeof value === "string" ? value : resolveLocalized(value, lang);

// The wrapper every field in a form uses: label + optional master-search
// glass + optional "recalled" badge, around whatever input the caller
// renders as children. Ported from the mock's ".f"/".lbl"/".mst"/".tag" markup.
export const Field = ({ id, label, searchTitle, recalled, children }: FieldProps) => {
    const { lang, t } = useTranslation();

    return (
        <div className={`${styles.f} ${recalled ? styles.recalled : ""}`}>
            <label className={styles.lbl} htmlFor={id}>
                <span>{resolveLabel(label, lang)}</span>
                {searchTitle && (
                    <Tooltip label={resolveLabel(searchTitle, lang)}>
                        <span className={styles.mst}>
                            ⌕
                        </span>
                    </Tooltip>
                )}
                {recalled && <span className={styles.tag}>{t("recalled")}</span>}
            </label>
            {children}
        </div>
    );
};
