import { useCallback, useRef } from "react";
import type { PointerEvent, RefObject } from "react";

const MIN_THUMB_SIZE = 24;

// One axis' worth of thumb-drag pointer handling — split out of
// useCustomScrollbar.ts purely to stay under that file's own line budget
// (docs/CodingStandards.md) now that a horizontal thumb doubled what used
// to be one axis' handlers. `axis` picks which scroll/client properties to
// read; everything else (pointer capture, delta math) is identical between
// the vertical and horizontal thumb.
export const useThumbDrag = (contentRef: RefObject<HTMLDivElement | null>, axis: "y" | "x") => {
    // Not state — written and read every pointermove of a drag, which would
    // otherwise mean a re-render per pixel of mouse movement just to
    // remember where the drag started.
    const dragRef = useRef<{ startPos: number; startScroll: number } | null>(null);

    const onPointerDown = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            const el = contentRef.current;
            if (!el) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
                startPos: axis === "y" ? event.clientY : event.clientX,
                startScroll: axis === "y" ? el.scrollTop : el.scrollLeft,
            };
            // Stops the drag from also starting a native text-selection drag
            // on whatever's under the (invisible, cursor:none) real mouse
            // position — the thumb itself has no selectable text, but the
            // mousedown still bubbles as a selection-start otherwise.
            event.preventDefault();
        },
        [contentRef, axis],
    );

    const onPointerMove = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            const el = contentRef.current;
            const drag = dragRef.current;
            if (!el || !drag) return;
            const scrollSize = axis === "y" ? el.scrollHeight : el.scrollWidth;
            const clientSize = axis === "y" ? el.clientHeight : el.clientWidth;
            const size = Math.max(MIN_THUMB_SIZE, (clientSize / scrollSize) * clientSize);
            const trackRange = clientSize - size;
            const scrollRange = scrollSize - clientSize;
            if (trackRange <= 0 || scrollRange <= 0) return;
            const pos = axis === "y" ? event.clientY : event.clientX;
            const delta = pos - drag.startPos;
            const nextScroll = drag.startScroll + (delta / trackRange) * scrollRange;
            if (axis === "y") el.scrollTop = nextScroll;
            else el.scrollLeft = nextScroll;
        },
        [contentRef, axis],
    );

    const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
        dragRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }, []);

    return { onPointerDown, onPointerMove, onPointerUp };
};
