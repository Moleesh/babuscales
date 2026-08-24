import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Tooltip } from "@components/Tooltip";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/AppShell.module.css";

export interface TopBarOverflowProps {
    /** The secondary controls (Settings/Language/Operator/Help) plus any
        primary tabs AppShell itself has decided don't fit —
        rendered inline when `collapsed` is false, behind the "..." menu
        when it's true. Opaque to this component either way. */
    children: ReactNode;
    /** Measured by AppShell's `useTopBarFit` (real scrollWidth/clientWidth
        fit, not a guessed breakpoint — see that hook's own comment) —
        whether the row actually has room to show `children` inline. */
    collapsed: boolean;
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
        // Task: "on scroll close all the dropdowns" — same reasoning as
        // Select.tsx's own copy of this hook, including the `contains` guard
        // so scrolling the menu's own contents doesn't close it.
        const onScroll = (event: Event) => {
            if (ref.current && event.target instanceof Node && ref.current.contains(event.target)) return;
            onClose();
        };
        document.addEventListener("scroll", onScroll, { capture: true, passive: true });
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("scroll", onScroll, { capture: true });
        };
    }, [open, onClose]);
    return ref;
};

// Collapses whatever it's given behind a "..." menu once the top bar
// doesn't actually have room to show it inline (`collapsed`, from
// AppShell's `useTopBarFit`). AppShell.tsx feeds it the
// secondary top-bar controls (App.tsx's `topRight`) and any primary tabs
// that no longer fit; the always-visible pin toggle stays outside it
// entirely.
export const TopBarOverflow = ({ children, collapsed }: TopBarOverflowProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useCloseOnOutsideClick(open, () => setOpen(false));

    if (!collapsed) return <>{children}</>;

    return (
        <div className={styles.overflow} ref={ref}>
            <Tooltip label={t("components.appShell.more")}>
                <button
                    className="iconbtn"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label={t("components.appShell.more")}
                    onClick={() => setOpen((value) => !value)}
                >
                    ⋯
                </button>
            </Tooltip>
            {open && (
                <div className={styles.overflowMenu} role="menu" onClick={() => setOpen(false)}>
                    {children}
                </div>
            )}
        </div>
    );
};
