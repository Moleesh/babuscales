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

// Small clickable rows (Select's own options, SearchableDropdown's option
// buttons) opt into a smaller hover ring than the default 38px — that size
// was tuned for regular buttons/chips and dwarfed a compact list row (task:
// "when hovering the dropdown can we make it smaller?"). Any element that
// wants this just carries `data-cursor="compact"`.
const COMPACT_SELECTOR = '[data-cursor="compact"]';

const ACTIVE_CLASS = "custom-cursor-active";

export interface CursorTracking {
    dotRef: React.RefObject<HTMLDivElement | null>;
    hoverInteractive: boolean;
    hoverCompact: boolean;
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
    const [hoverCompact, setHoverCompact] = useState(false);
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

        // Root cause of the reported "flickering when hovering on the
        // items" (Select's open list, SearchableDropdown's popover, the
        // Date Format list): hover state used to be derived from raw
        // `mousemove` samples — even coalesced to once per rAF frame, that
        // is still *polling* an event that fires far faster than the
        // pointer's real target changes, so any single mis-hit sample
        // (landing on a border pixel, a sub-pixel rounding seam between two
        // flush rows, etc.) could still win a frame and flip state. The
        // actual fix: don't derive hover from mousemove at all. `mouseover`/
        // `mouseout` are dispatched by the browser exactly once per genuine
        // DOM enter/exit of a subtree — they can't fire on a between-frame
        // sampling race because there's no sampling, just real enter/exit
        // events. Position still comes from mousemove (that part was never
        // the bug — a follower dot lagging isn't "flicker"), coalesced to
        // once per rAF frame as before to keep transform writes cheap.
        const resolveHover = (target: EventTarget | null) => {
            const interactive = target instanceof Element ? target.closest(INTERACTIVE_SELECTOR) !== null : false;
            setHoverInteractive((previous) => (previous === interactive ? previous : interactive));
            const compact = target instanceof Element ? target.closest(COMPACT_SELECTOR) !== null : false;
            setHoverCompact((previous) => (previous === compact ? previous : compact));
            const text = target instanceof Element ? target.closest(TEXT_SELECTOR) !== null : false;
            setHoverText((previous) => (previous === text ? previous : text));
        };
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
        };
        // `mouseover`/`mouseout` bubble, so one pair of window-level
        // listeners covers every row without wiring per-element handlers.
        // `relatedTarget` (where the pointer came from/went to) is read on
        // `mouseout` purely to skip the redundant resolve when the move was
        // entirely within the same matched subtree (e.g. from a row's text
        // span to its own padding) — `closest()` on the entered target would
        // already produce the same answer, this just avoids the extra call.
        const onOver = (event: MouseEvent) => resolveHover(event.target);
        const onOut = (event: MouseEvent) => {
            if (event.relatedTarget === null) resolveHover(null);
        };
        const onDown = () => setPressed(true);
        const onUp = () => setPressed(false);
        const onLeave = () => {
            position.current = { x: -100, y: -100 };
            resolveHover(null);
        };
        // Scrolling any panel underneath a stationary pointer moves content,
        // not the mouse — Chromium never dispatches mouseover/mouseout for
        // that, so `resolveHover` above never re-runs and the ring keeps
        // showing whatever was under the cursor *before* the scroll (task:
        // ring left floating over a card's header after the Set button that
        // was actually hovered scrolled out from under it). `elementFromPoint`
        // at the last-known screen position re-resolves what's really there
        // now. Capture + any scrollable ancestor, not just window, since
        // `.main`'s own scroll (AppShell) is what triggers this most.
        const onScroll = () => {
            resolveHover(document.elementFromPoint(position.current.x, position.current.y));
        };

        window.addEventListener("mousemove", onMove, { passive: true });
        window.addEventListener("mouseover", onOver, { passive: true });
        window.addEventListener("mouseout", onOut, { passive: true });
        window.addEventListener("mousedown", onDown);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("mouseleave", onLeave);
        window.addEventListener("scroll", onScroll, { passive: true, capture: true });
        return () => {
            document.body.classList.remove(ACTIVE_CLASS);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseover", onOver);
            window.removeEventListener("mouseout", onOut);
            window.removeEventListener("mousedown", onDown);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("mouseleave", onLeave);
            window.removeEventListener("scroll", onScroll, true);
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        };
    }, [enabled]);

    return { dotRef, hoverInteractive, hoverCompact, hoverText, pressed };
};
