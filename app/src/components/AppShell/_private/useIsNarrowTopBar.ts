import { useEffect, useState } from "react";

// Matches AppShell.module.css's own `max-width: 880px` breakpoint (task #58's
// comment: below this width the brandbox + labelled tabs + topRight chips no
// longer fit one 52px row). Kept as one source of truth for the JS side —
// TopBarOverflow uses this to decide whether to collapse `topRight` into the
// "⋯" menu; the CSS breakpoint independently handles icon-only tabs.
const NARROW_TOP_BAR_QUERY = "(max-width: 880px)";

// jsdom (vitest's test environment) doesn't implement `matchMedia` — treated
// the same as SSR: nothing to measure yet, so stay "not narrow" until a real
// browser's effect runs.
const supportsMatchMedia = (): boolean =>
    typeof window !== "undefined" && typeof window.matchMedia === "function";

export const useIsNarrowTopBar = (): boolean => {
    const [narrow, setNarrow] = useState(
        () => supportsMatchMedia() && window.matchMedia(NARROW_TOP_BAR_QUERY).matches,
    );

    useEffect(() => {
        if (!supportsMatchMedia()) return;
        const mql = window.matchMedia(NARROW_TOP_BAR_QUERY);
        const onChange = () => setNarrow(mql.matches);
        onChange();
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);

    return narrow;
};
