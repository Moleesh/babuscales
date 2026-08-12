import type { ReactNode } from "react";

import styles from "./_styles/Card.module.css";

export interface CardProps {
    /** Rendered in the header's left side — usually a `.lbl` title. */
    title?: ReactNode;
    /** Rendered on the header's right, pushed there like the mock's `.push`. */
    headerRight?: ReactNode;
    children: ReactNode;
}

// The one panel every screen is built from (PLAN §10) — a bordered
// surface with an optional header strip and a padded body. Ported from the
// mock's ".card"/".card>header"/".card>.body".
export const Card = ({ title, headerRight, children }: CardProps) => (
    <section className={styles.card}>
        {(title || headerRight) && (
            <header className={styles.header}>
                {title}
                {headerRight && <span className={styles.push}>{headerRight}</span>}
            </header>
        )}
        <div className={styles.body}>{children}</div>
    </section>
);
