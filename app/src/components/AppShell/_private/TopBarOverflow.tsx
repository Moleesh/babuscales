import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/TopBarOverflow.module.css";
import { useIsNarrowTopBar } from "./useIsNarrowTopBar";

export interface TopBarOverflowProps {
    /** The right-side cluster (language toggle, operator chip, help button, …) — feature-owned, this component only decides whether it renders inline or behind "⋯". */
    children: ReactNode;
}

// Item 1's fix: below the narrow-top-bar breakpoint (useIsNarrowTopBar), the
// right-side cluster no longer sits inline — it collapses into a single "⋯"
// button that opens a dropdown holding the same content. The 5 nav tabs
// never move; only this cluster does. Outside-click/Escape-closes dropdown
// follows the same shape as reports/_private/ExportMenu.tsx.
export const TopBarOverflow = ({ children }: TopBarOverflowProps) => {
    const { t } = useTranslation();
    const narrow = useIsNarrowTopBar();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!narrow) setOpen(false);
    }, [narrow]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    if (!narrow) return <>{children}</>;

    return (
        <div className={styles.root} ref={rootRef}>
            <button
                type="button"
                className={`iconbtn ${styles.trigger}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={t("components.appShell.moreOptions")}
                title={t("components.appShell.moreOptions")}
                onClick={() => setOpen((v) => !v)}
            >
                ⋯
            </button>
            {/* No close-on-inner-click here (unlike ExportMenu): the operator
                chip needs to stay open through a click-to-edit + typed
                commit, so only the outside-click/Escape handlers above close
                this menu. */}
            {open && (
                <div className={styles.menu} role="menu">
                    {children}
                </div>
            )}
        </div>
    );
};
