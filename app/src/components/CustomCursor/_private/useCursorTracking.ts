import { useLayoutEffect, useRef, useState } from "react";

// Matches base.css's own "what counts as clickable" selector list (§ Cursor +
// interaction feedback) — reused here rather than re-deriving what's
// interactive, so this component and the native `cursor:` rules never
// disagree about what a hover state means.
const INTERACTIVE_SELECTOR = [
    "button:not(:disabled)",
    '[role="button"]:not([aria-disabled="true"])',
    "a[href]",
    "select:not(:disabled)",
    ".chip.act",
    ".iconbtn:not(:disabled)",
    'input[type="checkbox"]:not(:disabled)',
    'input[type="radio"]:not(:disabled)',
].join(",");

// Matches base.css's/CustomCursor.module.css's own text-cursor selector
// list — the one case the native cursor is deliberately left on (the
// caret/I-beam) instead of being hidden. The follower has no idea an input
// exists though: without this it kept rendering its ring+dot on top of
// that native caret, i.e. two cursors visible at once over any edit field.
const TEXT_SELECTOR = [
    'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]):not([readonly]):not(:disabled)',
    "textarea:not([readonly]):not(:disabled)",
    '[contenteditable="true"]',
].join(",");

const ACTIVE_CLASS = "custom-cursor-active";

export interface CursorTracking {
    dotRef: React.RefObject<HTMLDivElement | null>;
    hoverInteractive: boolean;
    hoverText: boolean;
    pressed: boolean;
}

// Wires the mousemove/mousedown/mouseup listeners once `enabled`, writing
// position straight to the DOM via rAF (never React state — a mousemove
// must not trigger a re-render) and toggling body's `.custom-cursor-active`
// so CSS module can hide the native cursor while this one is live.
export const useCursorTracking = (enabled: boolean): CursorTracking => {
    const dotRef = useRef<HTMLDivElement>(null);
    const position = useRef({ x: -100, y: -100 });
    const frame = useRef<number | null>(null);
    const [hoverInteractive, setHoverInteractive] = useState(false);
    const [hoverText, setHoverText] = useState(false);
    const [pressed, setPressed] = useState(false);

    // useLayoutEffect (not useEffect): the class add is what suppresses the
    // native cursor (CustomCursor.module.css's `body.custom-cursor-active`
    // rule). useEffect fires after the browser has already painted, so the
    // native pointer/hand cursor flashed for a frame on every mount before
    // this caught up — useLayoutEffect applies it before that paint.
    useLayoutEffect(() => {
        if (!enabled) return undefined;
        document.body.classList.add(ACTIVE_CLASS);

        const applyFrame = () => {
            const node = dotRef.current;
            if (node) {
                node.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`;
            }
            frame.current = null;
        };
        const onMove = (event: MouseEvent) => {
            position.current = { x: event.clientX, y: event.clientY };
            if (frame.current === null) frame.current = requestAnimationFrame(applyFrame);
            const target = event.target;
            const interactive = target instanceof Element ? target.closest(INTERACTIVE_SELECTOR) !== null : false;
            setHoverInteractive((previous) => (previous === interactive ? previous : interactive));
            const text = target instanceof Element ? target.closest(TEXT_SELECTOR) !== null : false;
            setHoverText((previous) => (previous === text ? previous : text));
        };
        const onDown = () => setPressed(true);
        const onUp = () => setPressed(false);
        const onLeave = () => {
            position.current = { x: -100, y: -100 };
        };

        window.addEventListener("mousemove", onMove, { passive: true });
        window.addEventListener("mousedown", onDown);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("mouseleave", onLeave);
        return () => {
            document.body.classList.remove(ACTIVE_CLASS);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mousedown", onDown);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("mouseleave", onLeave);
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        };
    }, [enabled]);

    return { dotRef, hoverInteractive, hoverText, pressed };
};
