import styles from "../_styles/AppShell.module.css";

// The weighbridge seen from the side: the deck carries the letters, the
// load cells carry the deck. BS is a constant maker's mark, not the real
// logo — the real one is a deferred action item (PLAN §23, item 1). The
// deck glows and the two load cells pulse in sequence, left then right —
// weight settling across the bridge — a slow, ambient loop since this
// sits in the persistent top bar (see markDeckGlow/markCellPulse,
// AppShell.module.css; both no-op under prefers-reduced-motion).
export const BrandMark = () => (
    <svg className={styles.mark} viewBox="0 0 38 32" role="img" aria-label="BabuScales by Babulens">
        <text className={styles.markLetters} x="19" y="16.5" textAnchor="middle" fontSize="15">
            BS
        </text>
        <rect className={styles.markDeck} x="1.5" y="19.5" width="35" height="4" rx="1.6" />
        <rect className={styles.markCell} x="7" y="24" width="4" height="3.6" rx="1.2" />
        <rect className={styles.markCell} x="27" y="24" width="4" height="3.6" rx="1.2" />
        <rect className={styles.markBase} x="3.5" y="28.4" width="31" height="2.2" rx="1.1" />
    </svg>
);
