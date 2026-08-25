import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

import { useThumbDrag } from "./useThumbDrag";

const MIN_THUMB_SIZE = 24;

interface Thumb {
    top: number;
    height: number;
    visible: boolean;
}

interface ThumbX {
    left: number;
    width: number;
    visible: boolean;
}

const NO_THUMB: Thumb = { top: 0, height: 0, visible: false };
const NO_THUMB_X: ThumbX = { left: 0, width: 0, visible: false };

// Shared thumb-size/position math for one axis — pulled out of `recompute`
// below purely to keep that (and this file's default-export hook) under the
// line budget (docs/CodingStandards.md) now that a second (horizontal) axis
// doubled what used to be one inline calculation.
const computeThumb = (scrollPos: number, scrollSize: number, clientSize: number): { pos: number; size: number } => {
    const size = Math.max(MIN_THUMB_SIZE, (clientSize / scrollSize) * clientSize);
    const scrollRange = scrollSize - clientSize;
    const trackRange = clientSize - size;
    const pos = scrollRange > 0 ? (scrollPos / scrollRange) * trackRange : 0;
    return { pos, size };
};

// The native OS/browser scrollbar can't be fully re-skinned in cursor terms
// — dragging its thumb hands pointer handling to the browser/OS itself,
// which is why the native cursor still showed over a table's scrollbar
// during click-and-drag, so `cursor: none` on the page is ignored
// for the whole drag gesture regardless of what CSS targets the
// `::-webkit-scrollbar-*` pseudo-elements (base.css's hover-only fix).
// This renders a plain `<div>` thumb instead — a real DOM node the custom
// cursor's `body.custom-cursor-active *` rule already reaches, and whose
// drag we drive ourselves via pointer capture (useThumbDrag.ts), so the
// browser never takes the gesture over.
export const useCustomScrollbar = (contentRef: RefObject<HTMLDivElement | null>) => {
    const [thumb, setThumb] = useState<Thumb>(NO_THUMB);
    // Task: "horizontal scroll bar is missing when data is there" — this
    // hook used to only ever compute a vertical thumb, so a table wide
    // enough to overflow (Reports' Tickets table, most Masters lists) had
    // real `overflow-x: auto` scrolling (DataTable.module.css's `.wrapper`)
    // but zero visible affordance for it once the native scrollbar was
    // hidden (`.content`'s `scrollbar-width: none` — ScrollArea.module.css)
    // — the only way to reach those columns was an undiscoverable
    // shift+wheel/trackpad swipe. Mirrors the vertical thumb's own math
    // (`computeThumb` above), off `scrollLeft`/`scrollWidth`/`clientWidth`
    // instead.
    const [thumbX, setThumbX] = useState<ThumbX>(NO_THUMB_X);

    const recompute = useCallback(() => {
        const el = contentRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = el;
        if (scrollHeight <= clientHeight) {
            setThumb((previous) => (previous.visible ? NO_THUMB : previous));
        } else {
            const { pos, size } = computeThumb(scrollTop, scrollHeight, clientHeight);
            setThumb({ top: pos, height: size, visible: true });
        }
        if (scrollWidth <= clientWidth) {
            setThumbX((previous) => (previous.visible ? NO_THUMB_X : previous));
        } else {
            const { pos, size } = computeThumb(scrollLeft, scrollWidth, clientWidth);
            setThumbX({ left: pos, width: size, visible: true });
        }
    }, [contentRef]);

    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        recompute();
        // Covers both directions of drift: the row count changing this
        // container's own scrollHeight (already caught by consumers calling
        // recompute via their own onScroll), and the container's own
        // clientHeight changing from a window resize or a sibling layout
        // shift, which nothing else here observes.
        const resizeObserver = new ResizeObserver(recompute);
        resizeObserver.observe(el);
        return () => resizeObserver.disconnect();
    }, [contentRef, recompute]);

    const vertical = useThumbDrag(contentRef, "y");
    const horizontal = useThumbDrag(contentRef, "x");

    return {
        thumb,
        thumbX,
        recompute,
        onThumbPointerDown: vertical.onPointerDown,
        onThumbPointerMove: vertical.onPointerMove,
        onThumbPointerUp: vertical.onPointerUp,
        onThumbXPointerDown: horizontal.onPointerDown,
        onThumbXPointerMove: horizontal.onPointerMove,
        onThumbXPointerUp: horizontal.onPointerUp,
    };
};
