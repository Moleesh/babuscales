import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useModalFocus } from "./_private/useModalFocus";
import styles from "./_styles/AppModal.module.css";

export interface AppModalProps {
    open: boolean;
    title: ReactNode;
    onClose: () => void;
    closeLabel?: string;
    /** "default" = mock's `.sheet` (760px) — most dialogs. "small" = mock's `.sheet.sm` (420px) — a short confirmation like the admin unlock. */
    size?: "default" | "small";
    children: ReactNode;
}

// The one dialog every screen-blocking prompt in the app is built from
// — ported from the mock's ".modal"/".sheet". `data-enter-scope`
// makes it the active Enter-as-Tab scope while open, same
// mechanism as `ContextualHelp`'s drawer. Backdrop click and Escape both
// close it, matching every one of the mock's own modals. Focus management
// (move in on open, restore on close, trap Tab) lives in `useModalFocus`.
export const AppModal = ({
    open,
    title,
    onClose,
    closeLabel = "Close",
    size = "default",
    children,
}: AppModalProps) => {
    const { sheetRef, trapTab } = useModalFocus(open);

    if (!open) return null;

    // Bug: "indicator is not behind the grey shade" — AppShell's weight
    // readout (`.headerSticky`, AppShell.module.css) is a sibling of every
    // screen's own content deep inside AppShell's scroll container, not an
    // ancestor of this modal. Rendered in place (no portal), this backdrop's
    // `position: fixed` still nominally covers the viewport by z-index, but
    // stayed visually behind/beside the readout in practice — a portal to
    // `document.body` is the standard fix: it puts the backdrop in a
    // stacking context of its own at the very end of `<body>`, with nothing
    // from the app tree (this readout included) able to leak above it
    // regardless of where the modal that opened it happens to live.
    return createPortal(
        <div
            className={styles.backdrop}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={sheetRef}
                className={`${styles.sheet} ${size === "small" ? styles.small : ""}`}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                data-enter-scope
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        onClose();
                        return;
                    }
                    trapTab(event);
                }}
            >
                <header className={styles.header}>
                    <span className="lbl">{title}</span>
                    <span className={styles.push}>
                        <button className="iconbtn" aria-label={closeLabel} onClick={onClose}>
                            ✕
                        </button>
                    </span>
                </header>
                <div className={styles.body}>{children}</div>
            </div>
        </div>,
        document.body,
    );
};
