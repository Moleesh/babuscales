import { useEffect, useRef } from "react";
import type { RefObject } from "react";

type DragState = { x: number; y: number; scrollLeft: number; scrollTop: number };

// Click-drag panning for TemplatePreviewFrame's viewport when the hand tool
// (TemplatePreviewControls' 🖐) is on. Native `addEventListener` rather than
// React's `onPointerDown`/etc. props — the viewport is now a ScrollArea
// (components/ScrollArea, the app's standard custom-scrollbar container:
// task "not the standard scroll bar we use"), which only forwards a
// `contentRef` to its real scrollable element, not arbitrary pointer
// handlers, so this attaches directly to that ref's DOM node instead.
export const useTemplatePreviewPan = (panMode: boolean, contentRef: RefObject<HTMLDivElement | null>): void => {
    const dragRef = useRef<DragState | null>(null);

    useEffect(() => {
        const el = contentRef.current;
        if (!el || !panMode) return;

        const onPointerDown = (event: PointerEvent): void => {
            el.setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
        };
        const onPointerMove = (event: PointerEvent): void => {
            const drag = dragRef.current;
            if (!drag) return;
            el.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
            el.scrollTop = drag.scrollTop - (event.clientY - drag.y);
        };
        const onPointerUp = (): void => {
            dragRef.current = null;
        };

        el.addEventListener("pointerdown", onPointerDown);
        el.addEventListener("pointermove", onPointerMove);
        el.addEventListener("pointerup", onPointerUp);
        el.addEventListener("pointercancel", onPointerUp);
        return () => {
            el.removeEventListener("pointerdown", onPointerDown);
            el.removeEventListener("pointermove", onPointerMove);
            el.removeEventListener("pointerup", onPointerUp);
            el.removeEventListener("pointercancel", onPointerUp);
        };
    }, [panMode, contentRef]);
};
