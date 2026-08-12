import { useEffect, useState } from "react";

// Per icon-only tab width (padding + icon, AppShell.module.css's <=880px
// rule) plus its 2px gap, and the fixed overhead the top bar always carries
// once it's in that regime: the shrunk brand mark, the always-visible pin
// toggle, and the overflow "..." button itself (task #62). Deliberately a
// conservative estimate, not pixel-perfect — this only has to guarantee a
// tab is moved into TopBarOverflow's menu before it would visibly clip, not
// pack the row as tightly as possible.
const TAB_WIDTH = 42;
const FIXED_OVERHEAD = 170;
const NARROW_TABS_QUERY = "(max-width: 880px)";

const computeVisible = (total: number): number => {
    // jsdom (vitest) has no `matchMedia` — same "assume the wide-desktop
    // regime, same as `typeof window === "undefined"`" fallback.
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return total;
    if (!window.matchMedia(NARROW_TABS_QUERY).matches) return total;
    const budget = window.innerWidth - FIXED_OVERHEAD;
    return Math.min(total, Math.max(1, Math.floor(budget / TAB_WIDTH)));
};

// How many of the primary nav tabs (Dashboard/Weighing/Cameras/Reports/
// Masters) fit on the top bar before the rest must move into
// TopBarOverflow's menu, trailing tabs first — the primary-tab half of
// task #62: Settings/Language/Operator/Help already collapse there, but a
// wide business name or a very narrow window could still shrink the tabs
// row itself down to a sliver with no visible way to reach what scrolled
// out of view (the reported "Reports" → "Rep" clipping). Above 880px this
// is always `total` — full-label tabs already fit the row by design.
export const useVisibleTabCount = (total: number): number => {
    const [count, setCount] = useState(() => computeVisible(total));

    useEffect(() => {
        const onResize = () => setCount(computeVisible(total));
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [total]);

    return count;
};
