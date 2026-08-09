import type { ReactNode } from "react";

import styles from "./AppModal.module.css";

export interface AppModalProps {
    open: boolean;
    title: ReactNode;
    onClose: () => void;
    closeLabel?: string;
    children: ReactNode;
}

// The one dialog every screen-blocking prompt in the app is built from
// (PLAN §10) — ported from the mock's ".modal"/".sheet". `data-enter-scope`
// makes it the active Enter-as-Tab scope while open (PLAN §13), same
// mechanism as `ContextualHelp`'s drawer. Backdrop click and Escape both
// close it, matching every one of the mock's own modals.
export const AppModal = ({
    open,
    title,
    onClose,
    closeLabel = "Close",
    children,
}: AppModalProps) => {
    if (!open) return null;

    return (
        <div
            className={styles.backdrop}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className={styles.sheet}
                role="dialog"
                aria-modal="true"
                data-enter-scope
                onKeyDown={(event) => {
                    if (event.key === "Escape") onClose();
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
