import { useEffect, useState } from "react";

// Mirrors AppShell.module.css's own 880px breakpoint (icon-only tabs, brand
// site line hidden) — the point past which the secondary top-bar controls
// (Settings/Language/Operator/Help, wired up in App.tsx's `topRight`) no
// longer fit inline and TopBarOverflow needs to know, in React, to collapse
// them behind the "..." menu instead (task #62).
const NARROW_QUERY = "(max-width: 880px)";

// jsdom (vitest) has no `matchMedia` — same "assume the wide-desktop
// regime" fallback useVisibleTabCount.ts's own `computeVisible` uses.
const hasMatchMedia = (): boolean =>
    typeof window !== "undefined" && typeof window.matchMedia === "function";

export const useIsNarrowTopBar = (): boolean => {
    const [narrow, setNarrow] = useState(() => hasMatchMedia() && window.matchMedia(NARROW_QUERY).matches);

    useEffect(() => {
        if (!hasMatchMedia()) return;
        const mql = window.matchMedia(NARROW_QUERY);
        const onChange = () => setNarrow(mql.matches);
        onChange();
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);

    return narrow;
};
