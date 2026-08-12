import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useTranslation } from "@i18n/useTranslation";

import { useIsNarrowTopBar } from "./useIsNarrowTopBar";
import styles from "../_styles/AppShell.module.css";

export interface TopBarOverflowProps {
    /** The secondary controls (Settings/Language/Operator/Help) plus any
        primary tabs AppShell itself has decided don't fit (task #62) —
        rendered inline above the breakpoint, behind the "..." menu below
        it. Opaque to this component either way. */
    children: ReactNode;
}

// Closes the menu on an outside click/tap — the one bit of behaviour this
// component owns beyond the plain "narrow ? menu : inline" toggle, so it's
// split out to keep the component itself under the line budget.
const useCloseOnOutsideClick = (open: boolean, onClose: () => void) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open, onClose]);
    return ref;
};

// Collapses whatever it's given behind a "..." menu once the top bar is too
// narrow to show it inline (useIsNarrowTopBar, AppShell.module.css's own
// 880px breakpoint) — task #62. AppShell.tsx feeds it the secondary
// top-bar controls (App.tsx's `topRight`) and any primary tabs that no
// longer fit; the always-visible pin toggle stays outside it entirely.
export const TopBarOverflow = ({ children }: TopBarOverflowProps) => {
    const { t } = useTranslation();
    const narrow = useIsNarrowTopBar();
    const [open, setOpen] = useState(false);
    const ref = useCloseOnOutsideClick(open, () => setOpen(false));

    if (!narrow) return <>{children}</>;

    return (
        <div className={styles.overflow} ref={ref}>
            <button
                className="iconbtn"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={t("components.appShell.more")}
                title={t("components.appShell.more")}
                onClick={() => setOpen((value) => !value)}
            >
                ⋯
            </button>
            {open && (
                <div className={styles.overflowMenu} role="menu" onClick={() => setOpen(false)}>
                    {children}
                </div>
            )}
        </div>
    );
};
