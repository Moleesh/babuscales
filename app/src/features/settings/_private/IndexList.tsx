import styles from "./_styles/SystemPane.module.css";
import type { IndexDefinition } from "./useIndexManagerActions";

export interface IndexListProps {
    indexes: IndexDefinition[];
    unlocked: boolean;
    busy: boolean;
    onDrop: (configId: string) => void;
}

// Split out of IndexManagerCard (over the line budget — docs/CodingStandards.md)
// — the existing-definitions list and its per-row Drop button, unchanged
// from the inline version it replaces.
export const IndexList = ({ indexes, unlocked, busy, onDrop }: IndexListProps) => (
    <>
        {indexes.length === 0 && <p className={styles.hint}>No custom indexes yet.</p>}
        {indexes.map((def) => (
            <div key={def.ConfigId} className={styles.statusRow}>
                <span>
                    {def.Table}.{def.Path}
                </span>
                <button
                    type="button"
                    className={`${styles.mini} ${styles.danger}`}
                    disabled={!unlocked || busy}
                    onClick={() => onDrop(def.ConfigId)}
                >
                    Drop
                </button>
            </div>
        ))}
    </>
);
