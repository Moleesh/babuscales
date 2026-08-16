import type { ReactNode } from "react";

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

    return (
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
        </div>
    );
};
