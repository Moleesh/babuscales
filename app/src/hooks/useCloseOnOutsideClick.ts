import { useLayoutEffect, useRef } from "react";

// Closes some open popover/menu/list on an outside click, and — task: "on
// scroll close all the dropdowns" — on any scroll outside the popover's own
// contents (`capture: true` so this fires for scrolls inside any nested
// scroll container, not just the window; the `contains` guard on both
// listeners means scrolling or clicking *inside* the open popover doesn't
// close it). Previously three near-identical copies of this exact hook
// (Select.tsx, AppShell's TopBarOverflow.tsx, reports' SavedReportsRow.tsx)
// that had already drifted (`useLayoutEffect` vs `useEffect`) — one real
// hook instead, still returning the same ref-to-attach-to-the-wrapper shape
// every caller already expects.
export const useCloseOnOutsideClick = (open: boolean, onClose: () => void) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener("pointerdown", onPointerDown);
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
