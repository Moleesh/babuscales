import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./_styles/Card.module.css";

export interface CardProps {
    /** Rendered in the header's left side — usually a `.lbl` title. */
    title?: ReactNode;
    /** Rendered on the header's right, pushed there like the mock's `.push`. */
    headerRight?: ReactNode;
    /** Pins the header (title + headerRight) to the top of the scroll area
     *  instead of scrolling away, stacked under AppShell's own sticky weight
     *  header (task: "make it sticky including the title" — the Reports
     *  title scrolling off while its own filter row stayed stuck below it
     *  read as broken/disconnected). Off by default — opt-in per caller. */
    sticky?: boolean;
    children: ReactNode;
}

// Exposes the sticky header's own rendered height as `--card-header-h` on
// the card element, so a caller's own sticky content further down (e.g.
// ReportsCardBody's `.stickyFilters`) can stack its `top` offset beneath
// this header instead of colliding with it at the same slot — same
// ResizeObserver shape as AppShell.tsx's `useStickyHeaderHeight` and
// ReportsCardBody's own `useStickyFiltersHeight`.
const useStickyCardHeaderHeight = (
    sticky: boolean | undefined,
    cardRef: RefObject<HTMLElement | null>,
    headerRef: RefObject<HTMLElement | null>,
    // Whether a header element currently exists in the DOM — a plain ref
    // object's *identity* never changes even when the node it points to
    // does (e.g. the header only starts rendering once `title` goes from
    // empty to non-empty after data loads), so that alone can't be a
    // dependency here. This flips (and re-renders) via the header's own
    // callback ref below whenever the node actually appears/disappears,
    // which is what lets the effect re-attach at the right time.
    hasHeader: boolean,
): void => {
    useEffect(() => {
        if (!sticky) return;
        const cardEl = cardRef.current;
        const headerEl = headerRef.current;
        if (!cardEl || !headerEl) return;
        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return;
            cardEl.style.setProperty("--card-header-h", `${entry.contentRect.height}px`);
        });
        observer.observe(headerEl);
        return () => observer.disconnect();
    }, [sticky, cardRef, headerRef, hasHeader]);
};

// The one panel every screen is built from — a bordered
// surface with an optional header strip and a padded body. Ported from the
// mock's ".card"/".card>header"/".card>.body".
export const Card = ({ title, headerRight, sticky, children }: CardProps) => {
    const cardRef = useRef<HTMLElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const [hasHeader, setHasHeader] = useState(false);
    // Callback ref (not just the plain object ref, kept alongside it for
    // `useStickyCardHeaderHeight`'s own `.current` reads): this is what
    // actually notifies us when the header node appears/disappears, since a
    // plain ref's identity is stable even as `.current` changes underneath it.
    const setHeaderRef = useCallback((node: HTMLElement | null) => {
        headerRef.current = node;
        setHasHeader(node !== null);
    }, []);
    useStickyCardHeaderHeight(sticky, cardRef, headerRef, hasHeader);
    return (
        <section className={styles.card} ref={cardRef}>
            {(title || headerRight) && (
                <header
                    className={sticky ? `${styles.header} ${styles.headerSticky}` : styles.header}
                    ref={setHeaderRef}
                >
                    {title}
                    {headerRight && <span className={styles.push}>{headerRight}</span>}
                </header>
            )}
            <div className={styles.body}>{children}</div>
        </section>
    );
};
