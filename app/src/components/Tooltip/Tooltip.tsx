import { useId, useState } from "react";
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
     * trigger) — wrong for a trigger sitting flush against the window's
     * right edge (the top bar's Minimize/Close buttons): a centered
     * `max-width: 220px` bubble there extends past the viewport and renders
     * clipped/invisible by `.app`'s `overflow: hidden`, which read as "the
     * tooltip is missing" even though it was mounting correctly the whole
     * time. "end" instead hangs the bubble off the trigger's right edge, so
     * it opens leftward into the window instead of off the edge. */
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
    children: ReactNode;
}

// A themed replacement for the native `title` attribute (task: "revamp the
// tooltip so it can be used in other components, and it matches the theme
// and localization"). The browser's own title tooltip ignores every design
// token — wrong font, wrong colors, a multi-second delay, unstyleable — so
// it looked out of place next to a themed app and couldn't carry a
// translated string consistently. This wraps a single trigger element and
// shows/hides a themed bubble on hover/focus, positioned with plain CSS
// rather than a portal (every current caller is inside a scroll container
// short enough that clipping isn't a concern — revisit with a portal if a
// future caller needs one near a viewport edge).
export const Tooltip = ({ label, side = "top", align = "center", className, style, children }: TooltipProps) => {
    const [open, setOpen] = useState(false);
    const id = useId();

    return (
        <span
            className={className ? `${styles.wrap} ${className}` : styles.wrap}
            style={style}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            aria-describedby={open ? id : undefined}
        >
            {children}
            {open && (
                <span
                    role="tooltip"
                    id={id}
                    className={`${styles.bubble} ${styles[side]} ${align === "end" ? styles.alignEnd : ""}`}
                >
                    {label}
                </span>
            )}
        </span>
    );
};
