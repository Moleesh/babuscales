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
// was tuned for regular buttons/chips and dwarfed a compact list row. Any element that
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

interface CursorTrackingState {
    dotRef: React.RefObject<HTMLDivElement | null>;
    position: React.RefObject<{ x: number; y: number }>;
    frame: React.RefObject<number | null>;
    setHoverInteractive: (updater: (previous: boolean) => boolean) => void;
    setHoverCompact: (updater: (previous: boolean) => boolean) => void;
    setHoverText: (updater: (previous: boolean) => boolean) => void;
    setPressed: (pressed: boolean) => void;
}

type HoverResolver = (target: EventTarget | null) => void;

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
const makeHoverResolver = (
    state: Pick<CursorTrackingState, "setHoverInteractive" | "setHoverCompact" | "setHoverText">,
): HoverResolver => (target) => {
    const interactive = target instanceof Element ? target.closest(INTERACTIVE_SELECTOR) !== null : false;
    state.setHoverInteractive((previous) => (previous === interactive ? previous : interactive));
    const compact = target instanceof Element ? target.closest(COMPACT_SELECTOR) !== null : false;
    state.setHoverCompact((previous) => (previous === compact ? previous : compact));
    const text = target instanceof Element ? target.closest(TEXT_SELECTOR) !== null : false;
    state.setHoverText((previous) => (previous === text ? previous : text));
};

// The window-level listener set itself — pulled out of the effect below
// purely to stay under the file's own line budget. Returns a cleanup
// function the effect can hand straight back to React.
const attachCursorListeners = ({
    dotRef,
    position,
    frame,
    setHoverInteractive,
    setHoverCompact,
    setHoverText,
    setPressed,
}: CursorTrackingState): (() => void) => {
    const resolveHover = makeHoverResolver({ setHoverInteractive, setHoverCompact, setHoverText });
    const applyFrame = () => {
        const node = dotRef.current;
        if (node) {
            node.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`;
        }
        frame.current = null;
    };
    const onMove = (event: MouseEvent | PointerEvent) => {
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
    // showing whatever was under the cursor *before* the scroll — the
    // ring was left floating over a card's header after the Set button
    // that was actually hovered scrolled out from under it. `elementFromPoint`
    // at the last-known screen position re-resolves what's really there
    // now. Capture + any scrollable ancestor, not just window, since
    // `.main`'s own scroll (AppShell) is what triggers this most.
    const onScroll = () => {
        resolveHover(document.elementFromPoint(position.current.x, position.current.y));
    };

    // ScrollArea's thumb (useCustomScrollbar.ts) drags via
    // `setPointerCapture` — while a pointer is captured, some engines
    // stop delivering the compatibility `mousemove` event outside the
    // captured element even though it still bubbles in theory (reported:
    // the dot froze in place for the whole scrollbar-thumb drag).
    // `pointermove` is what the capture actually redirects, so it always
    // fires; listening for both here is belt-and-suspenders — normal
    // mouse movement fires either one harmlessly twice.
    const bindings: [string, EventListener, boolean][] = [
        ["mousemove", onMove as EventListener, false],
        ["pointermove", onMove as EventListener, false],
        ["mouseover", onOver as EventListener, false],
        ["mouseout", onOut as EventListener, false],
        ["mousedown", onDown, false],
        ["mouseup", onUp, false],
        ["mouseleave", onLeave, false],
        ["scroll", onScroll, true],
    ];
    for (const [type, handler, capture] of bindings) {
        window.addEventListener(type, handler, { passive: true, capture });
    }
    return () => {
        document.body.classList.remove(ACTIVE_CLASS);
        for (const [type, handler, capture] of bindings) {
            window.removeEventListener(type, handler, capture);
        }
        if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
};

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
        return attachCursorListeners({
            dotRef,
            position,
            frame,
            setHoverInteractive,
            setHoverCompact,
            setHoverText,
            setPressed,
        });
    }, [enabled]);

    return { dotRef, hoverInteractive, hoverCompact, hoverText, pressed };
};
