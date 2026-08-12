import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

// Task #62's first two attempts both guessed a pixel budget (a `matchMedia`
// breakpoint assuming every tab fits inline above some fixed width) —
// wrong for this content's actual size, which is why "Cameras" clipped to
// "Car" instead of collapsing into the overflow menu at a width the guess
// considered "wide enough". This measures for real: the top bar's own
// `scrollWidth` (how much room its content actually wants) vs `clientWidth`
// (how much room it has) after every layout. If it doesn't fit, secondary
// controls collapse into TopBarOverflow's menu first; if that still isn't
// enough, primary tabs trim from the end one at a time — the same
// "secondary first, then trailing tabs" order the row's own JSX already
// documents. A `ResizeObserver` on the bar re-expands back to the full set
// and re-measures from scratch on every resize, so growing the window
// un-collapses things again instead of latching narrow forever.
export const useTopBarFit = (containerRef: RefObject<HTMLElement | null>, totalTabs: number) => {
    const [visibleTabCount, setVisibleTabCount] = useState(totalTabs);
    const [secondaryCollapsed, setSecondaryCollapsed] = useState(false);
    const [generation, setGeneration] = useState(0);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const fits = el.scrollWidth <= el.clientWidth + 1;
        if (fits) return;
        if (!secondaryCollapsed) {
            setSecondaryCollapsed(true);
            return;
        }
        if (visibleTabCount > 1) setVisibleTabCount((count) => count - 1);
        // Deliberately no `else` floor beyond 1 — a single tab plus the
        // overflow menu is still usable; there's nothing smaller to try.
    }, [containerRef, visibleTabCount, secondaryCollapsed, generation]);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el || typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver(() => {
            setVisibleTabCount(totalTabs);
            setSecondaryCollapsed(false);
            setGeneration((value) => value + 1);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [containerRef, totalTabs]);

    return { visibleTabCount, secondaryCollapsed };
};
