import styles from "./_styles/Spinner.module.css";
import type { SpinnerProps } from "./Spinner.types";

// The one spinner in the app (docs/CodingStandards.md §3 — "if it might be
// on screen twice, it is a component"). A ring built from a CSS border, not
// an image asset, so it never has a broken-path failure mode; it freezes
// rather than spins under `prefers-reduced-motion` (see the module's own
// media query), matching base.css's app-wide reduced-motion rule.
export const Spinner = ({ size = "md", label }: SpinnerProps) => (
    <span className={styles.wrapper} role="status" aria-live="polite">
        <span className={`${styles.ring} ${styles[size]}`} aria-hidden="true" />
        <span className={styles.srOnly}>{label}</span>
    </span>
);
