import styles from "../AppShell.module.css";

// The weighbridge seen from the side: the deck carries the letters, the
// load cells carry the deck. BLS is a constant maker's mark, not the real
// logo — the real one is a deferred action item (PLAN §23, item 1).
export const BrandMark = () => (
    <svg className={styles.mark} viewBox="0 0 38 32" role="img" aria-label="BabuScales by Babulens">
        <text className={styles.markLetters} x="19" y="16.5" textAnchor="middle" fontSize="13.5">
            BLS
        </text>
        <rect className={styles.markDeck} x="1.5" y="19.5" width="35" height="4" rx="1.6" />
        <rect className={styles.markCell} x="7" y="24" width="4" height="3.6" rx="1.2" />
        <rect className={styles.markCell} x="27" y="24" width="4" height="3.6" rx="1.2" />
        <rect className={styles.markBase} x="3.5" y="28.4" width="31" height="2.2" rx="1.1" />
    </svg>
);
