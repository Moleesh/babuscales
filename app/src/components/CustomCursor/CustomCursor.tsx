import { useCursorEnabled } from "./_private/useCursorEnabled";
import { useCursorTracking } from "./_private/useCursorTracking";
import styles from "./_styles/CustomCursor.module.css";

// The dot-and-ring pointer that replaces the OS cursor (PLAN request: a
// themed, animated follower). Position is written straight to the DOM via
// a ref + rAF loop rather than React state, so a mousemove never triggers a
// re-render — only the rarer hover/press *state* changes go through
// useState (see useCursorTracking). Renders nothing (and never touches the
// native cursor) when the user prefers reduced motion or has no fine
// pointer (touch), matching base.css's own reduced-motion posture.
export const CustomCursor = () => {
    const enabled = useCursorEnabled();
    const { dotRef, hoverInteractive, hoverCompact, hoverText, pressed } = useCursorTracking(enabled);

    if (!enabled) return null;

    // Compact wins over the regular hover growth — a dropdown option is
    // still "interactive" (hoverInteractive is also true), it just wants
    // the smaller ring instead of the default 38px one.
    const stateClass = pressed
        ? styles.pressed
        : hoverCompact
          ? styles.hoverCompact
          : hoverInteractive
            ? styles.hover
            : "";
    // Over an edit field the native caret/I-beam is deliberately left on
    // (CustomCursor.module.css's own text-cursor carve-out) — without this
    // the follower's ring+dot kept rendering on top of it, i.e. two visible
    // cursors at once over any input/textarea/contenteditable.
    const textClass = hoverText ? styles.hoverText : "";
    return (
        <div ref={dotRef} className={`${styles.cursor} ${stateClass} ${textClass}`} aria-hidden="true">
            <span className={styles.ring} />
            <span className={styles.dot} />
        </div>
    );
};
