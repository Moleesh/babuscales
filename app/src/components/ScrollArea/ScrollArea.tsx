import { useCallback } from "react";
import type { ReactNode, RefObject } from "react";

import { useCustomScrollbar } from "./_private/useCustomScrollbar";
import styles from "./_styles/ScrollArea.module.css";

export interface ScrollAreaProps {
    /** Class for the outer positioning wrapper — rarely needed, most callers
     * only care about `contentClassName`. */
    className?: string;
    /** Class for the actual scrollable element — pass whatever class the
     * native-scrollbar version of this container used (e.g. DataTable's
     * `.wrapper`, AppShell's `.main`); everything about that layout carries
     * over unchanged, only the scrollbar itself is now ours. */
    contentClassName?: string;
    /** The scrollable element's ref — callers that read `scrollTop`/
     * `clientHeight` off it directly (DataTable's virtualisation) pass their
     * own `useRef` through here instead of this component owning one
     * internally, so there's a single source of truth for the DOM node. */
    contentRef: RefObject<HTMLDivElement | null>;
    /** Forwarded straight to the scrollable element — e.g. DataTable's
     * virtualisation re-measures on every native scroll event same as
     * before; this component only adds the drag-driven `scrollTop` writes
     * on top, which fire their own native `scroll` events same as any
     * other scrollTop write, so existing `onScroll` consumers don't need
     * to change at all. */
    onScroll?: () => void;
    dataAttrs?: Record<string, string>;
    children: ReactNode;
}

// Swaps the native OS/browser scrollbar for a plain draggable `<div>` thumb
// — the native cursor would otherwise still show over a table's scrollbar
// during click-and-drag, since dragging a *native* scrollbar thumb hands
// pointer handling to the browser/OS, which shows its own cursor for the
// whole gesture no matter what CSS says; only a real DOM element we drive
// ourselves stays under the custom cursor's `body.custom-cursor-active *`
// rule throughout). The scrollable element underneath is still a plain
// `overflow: auto` div doing real scrolling (just with its native scrollbar
// hidden via CSS) — `scrollTop`/`scrollHeight`/`onScroll` all behave exactly
// as before, so this drops in around an existing scroll container without
// touching whatever reads or reacts to its scroll state.
export const ScrollArea = ({ className, contentClassName, contentRef, onScroll, dataAttrs, children }: ScrollAreaProps) => {
    const { thumb, recompute, onThumbPointerDown, onThumbPointerMove, onThumbPointerUp } = useCustomScrollbar(contentRef);

    const handleScroll = useCallback(() => {
        recompute();
        onScroll?.();
    }, [recompute, onScroll]);

    return (
        <div className={className ? `${styles.area} ${className}` : styles.area}>
            <div
                ref={contentRef}
                className={contentClassName ? `${styles.content} ${contentClassName}` : styles.content}
                onScroll={handleScroll}
                {...dataAttrs}
            >
                {children}
            </div>
            {thumb.visible && (
                <div className={styles.track} aria-hidden="true">
                    <div
                        className={styles.thumb}
                        style={{ top: thumb.top, height: thumb.height }}
                        onPointerDown={onThumbPointerDown}
                        onPointerMove={onThumbPointerMove}
                        onPointerUp={onThumbPointerUp}
                    />
                </div>
            )}
        </div>
    );
};
