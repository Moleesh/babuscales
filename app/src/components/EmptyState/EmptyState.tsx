import type { ReactNode } from "react";

import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
    icon?: ReactNode;
    title: ReactNode;
    hint?: ReactNode;
    action?: ReactNode;
}

// The "nothing here yet" state — an empty masters list, an empty open-ticket
// strip, a report with no rows in range. One look everywhere it appears.
export const EmptyState = ({ icon, title, hint, action }: EmptyStateProps) => (
    <div className={styles.wrapper}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <p className={styles.title}>{title}</p>
        {hint && <p className={styles.hint}>{hint}</p>}
        {action}
    </div>
);
