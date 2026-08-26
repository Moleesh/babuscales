import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

import styles from "./_styles/Tooltip.module.css";

export interface TooltipProps {
    /** Already-localized text — this component renders plain text, it
     * never owns a translation key itself, so any screen (Dashboard's bar
     * chart, a masters row, a settings hint, …) can reuse it with its own
     * `t()` call regardless of which i18n pack is active. */
    label: string;
    /** Where the bubble opens relative to the wrapped element. Defaults to
     * "top" — the common case (a chart bar, a KPI card) has more room
     * above than below its own trigger. */
    side?: "top" | "bottom";
    /** Horizontal anchor. Defaults to "center" (bubble centered on the
     * trigger) — wrong for a trigger sitting flush against an edge (the top
     * bar's Minimize/Close buttons, a table's right-hand column): a
     * centered bubble there would want to extend past that edge. "end"
     * instead hangs the bubble off the trigger's right edge, so it opens
     * leftward instead. */
    align?: "center" | "end";
    /** Extra class for the wrapper span. */
    className?: string;
    /** Inline layout overrides for the wrapper span — e.g. Dashboard's flex
     * `.bar` items need `flex: 1; height: 100%; display: flex` on the
     * wrapper itself, or the trigger they wrap collapses to its own content
     * size instead of taking part in the parent's flex layout. Inline
     * style (not a second CSS class) deliberately: two same-specificity
     * classes race for `display` in an unpredictable bundle order — that
     * exact collision once flipped `.wrap`'s `inline-block` on top of a
     * caller's `flex`, silently breaking the bar chart's bottom alignment.
     * `style` always wins over any stylesheet class, so there's no race. */
    style?: CSSProperties;
    /** Task: "show tooltip only for truncated ones" — the Language table's
     * key/English/language cells wrap this around an `overflow:hidden;
     * text-overflow:ellipsis` span, and a tooltip firing on every short,
     * un-truncated value (most of them) was just noise. When true, the
     * wrapped element's own truncation is measured (`scrollWidth` vs.
     * `clientWidth`) right before opening, and the bubble is skipped
     * entirely if nothing is actually cut off. Defaults to off — every
     * other caller (AppShell tabs, Dashboard bars, …) wraps non-truncating
     * content and still wants the tooltip on every hover. */
    onlyWhenTruncated?: boolean;
    children: ReactNode;
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;
// Rendered off-screen for one frame while its real size is measured — see
// the placement effect below.
const UNMEASURED_STYLE: CSSProperties = { position: "fixed", top: -9999, left: -9999 };

// A themed replacement for the native `title` attribute, so it can be
// reused across components and matches the app's theme and localization.
// The browser's own title tooltip ignores every design
// token — wrong font, wrong colors, a multi-second delay, unstyleable — so
// it looked out of place next to a themed app and couldn't carry a
// translated string consistently. Shows/hides a themed bubble on
// hover/focus.
//
// Bug: "tooltip [is] cut off" — FieldSchemaCard's Formula-column tooltip,
// whose full text can run well past a table row's own right edge, used to
// render in place (`position: absolute` inside `.wrap`) and get clipped by
// the table's horizontally-scrolling container the moment it did — this
// file's own doc comment used to excuse that as fine because "every current
// caller is inside a scroll container short enough that clipping isn't a
// concern"; a long formula was exactly the caller that outgrew it. Portaled
// to `document.body` and positioned from the trigger's live
// `getBoundingClientRect()` instead (same fix shape as AppModal.tsx's own
// backdrop-clipping fix), clamped to stay inside the viewport regardless of
// where the trigger sits — floats above any scrollable/clipping ancestor,
// not just the ones a caller happens to be shallow enough to avoid today.
export const Tooltip = ({
    label,
    side = "top",
    align = "center",
    className,
    style,
    onlyWhenTruncated,
    children,
}: TooltipProps) => {
    const [open, setOpen] = useState(false);
    const [bubbleStyle, setBubbleStyle] = useState<CSSProperties>(UNMEASURED_STYLE);
    const wrapRef = useRef<HTMLSpanElement>(null);
    const bubbleRef = useRef<HTMLSpanElement>(null);
    const id = useId();

    // `.wrap` itself never overflows (it's not the element with
    // `overflow:hidden`) — the truncated element is its first real child,
    // so that's what has to be measured. Bails open (shows the tooltip) if
    // there's nothing to measure yet, same as the non-truncation-aware path.
    const isTruncated = (): boolean => {
        const truncated = wrapRef.current?.firstElementChild;
        if (!truncated) return true;
        return truncated.scrollWidth > truncated.clientWidth;
    };
    const maybeOpen = (): void => {
        if (onlyWhenTruncated && !isTruncated()) return;
        setOpen(true);
    };

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const wrap = wrapRef.current;
            if (!wrap) return;
            const rect = wrap.getBoundingClientRect();
            const bubbleWidth = bubbleRef.current?.offsetWidth ?? 220;
            const bubbleHeight = bubbleRef.current?.offsetHeight ?? 28;
            const rawLeft = align === "end" ? rect.right - bubbleWidth : rect.left + rect.width / 2 - bubbleWidth / 2;
            const left = Math.min(Math.max(rawLeft, VIEWPORT_MARGIN), window.innerWidth - bubbleWidth - VIEWPORT_MARGIN);
            const rawTop = side === "top" ? rect.top - GAP - bubbleHeight : rect.bottom + GAP;
            // Bug: only `left` used to be clamped to the viewport — a row
            // near the top of a scrolling table (default side="top") could
            // compute a negative `top` and render the bubble off-screen or
            // under a sticky header, the vertical twin of the "tooltip cut
            // off" bug the horizontal clamp above already fixed.
            const top = Math.min(Math.max(rawTop, VIEWPORT_MARGIN), window.innerHeight - bubbleHeight - VIEWPORT_MARGIN);
            setBubbleStyle({ position: "fixed", top, left });
        };
        place();
        // Re-measures on resize, same as before. Scroll used to also
        // re-measure and keep the bubble glued to its trigger, but inside a
        // scrolling table that meant the bubble dragged down the screen
        // trailing the row instead of just disappearing with it — task: "on
        // scroll close the tooltips". Any scroll now just closes it; the
        // hover/focus handlers below reopen it on the next genuine hover.
        const close = () => setOpen(false);
        window.addEventListener("resize", place);
        window.addEventListener("scroll", close, true);
        // Bug: "all tooltips has to close on scroll or loosing focus or
        // chaning application" — scroll and `onBlur` (a focused trigger,
        // e.g. tab-focus) were already covered, but a hover-opened tooltip
        // has no DOM focus at all, so alt-tabbing away while hovering fired
        // neither and left the bubble floating over the previous app.
        // `window`'s own `blur` fires whenever the OS moves focus to another
        // application (or another window), regardless of what has DOM focus
        // inside this one.
        window.addEventListener("blur", close);
        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("blur", close);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `label` is included so a bubble whose text (and thus size) changes while already open re-measures.
    }, [open, side, align, label]);

    return (
        <span
            ref={wrapRef}
            className={className ? `${styles.wrap} ${className}` : styles.wrap}
            style={style}
            onMouseEnter={maybeOpen}
            onMouseLeave={() => setOpen(false)}
            onFocus={maybeOpen}
            onBlur={() => setOpen(false)}
            aria-describedby={open ? id : undefined}
        >
            {children}
            {open &&
                createPortal(
                    <span
                        ref={bubbleRef}
                        role="tooltip"
                        id={id}
                        className={`${styles.bubble} ${styles[side]} ${align === "end" ? styles.alignEnd : ""}`}
                        style={bubbleStyle}
                    >
                        {label}
                    </span>,
                    document.body,
                )}
        </span>
    );
};
