import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";

const MIN_THUMB_HEIGHT = 24;

interface Thumb {
    top: number;
    height: number;
    visible: boolean;
}

const NO_THUMB: Thumb = { top: 0, height: 0, visible: false };

// The native OS/browser scrollbar can't be fully re-skinned in cursor terms
// — dragging its thumb hands pointer handling to the browser/OS itself,
// which is why the native cursor still showed over a table's scrollbar
// during click-and-drag, so `cursor: none` on the page is ignored
// for the whole drag gesture regardless of what CSS targets the
// `::-webkit-scrollbar-*` pseudo-elements (base.css's hover-only fix).
// This renders a plain `<div>` thumb instead — a real DOM node the custom
// cursor's `body.custom-cursor-active *` rule already reaches, and whose
// drag we drive ourselves via pointer capture, so the browser never takes
// the gesture over.
export const useCustomScrollbar = (contentRef: RefObject<HTMLDivElement | null>) => {
    const [thumb, setThumb] = useState<Thumb>(NO_THUMB);
    // Not state — written and read every pointermove of a drag, which would
    // otherwise mean a re-render per pixel of mouse movement just to remember
    // where the drag started.
    const dragRef = useRef<{ startY: number; startScrollTop: number } | null>(null);

    const recompute = useCallback(() => {
        const el = contentRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight <= clientHeight) {
            setThumb((previous) => (previous.visible ? NO_THUMB : previous));
            return;
        }
        const height = Math.max(MIN_THUMB_HEIGHT, (clientHeight / scrollHeight) * clientHeight);
        const scrollRange = scrollHeight - clientHeight;
        const trackRange = clientHeight - height;
        const top = scrollRange > 0 ? (scrollTop / scrollRange) * trackRange : 0;
        setThumb({ top, height, visible: true });
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

    const onThumbPointerDown = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            const el = contentRef.current;
            if (!el) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { startY: event.clientY, startScrollTop: el.scrollTop };
            // Stops the drag from also starting a native text-selection drag
            // on whatever's under the (invisible, cursor:none) real mouse
            // position — the thumb itself has no selectable text, but the
            // mousedown still bubbles as a selection-start otherwise.
            event.preventDefault();
        },
        [contentRef],
    );

    const onThumbPointerMove = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            const el = contentRef.current;
            const drag = dragRef.current;
            if (!el || !drag) return;
            const { scrollHeight, clientHeight } = el;
            const height = Math.max(MIN_THUMB_HEIGHT, (clientHeight / scrollHeight) * clientHeight);
            const trackRange = clientHeight - height;
            const scrollRange = scrollHeight - clientHeight;
            if (trackRange <= 0 || scrollRange <= 0) return;
            const deltaY = event.clientY - drag.startY;
            el.scrollTop = drag.startScrollTop + (deltaY / trackRange) * scrollRange;
        },
        [contentRef],
    );

    const onThumbPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
        dragRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }, []);

    return { thumb, recompute, onThumbPointerDown, onThumbPointerMove, onThumbPointerUp };
};
