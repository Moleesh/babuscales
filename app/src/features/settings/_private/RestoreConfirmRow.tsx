import styles from "./SystemPane.module.css";

export interface RestoreConfirmRowProps {
    fileName: string | undefined;
    onConfirm: () => void;
    onCancel: () => void;
}

// Split out of BackupRestoreCard (over the line budget — docs/CodingStandards.md)
// — the "Restore this file?" confirmation row, unchanged from the inline
// version it replaces.
export const RestoreConfirmRow = ({ fileName, onConfirm, onCancel }: RestoreConfirmRowProps) => (
    <div className={styles.confirmRow}>
        <span>
            Restore &quot;{fileName}&quot;? Everything currently saved here — every ticket, master and
            setting — is replaced. This can&apos;t be undone.
        </span>
        <button type="button" className={`${styles.mini} ${styles.danger}`} onClick={onConfirm}>
            Yes, restore
        </button>
        <button type="button" className={styles.mini} onClick={onCancel}>
            Cancel
        </button>
    </div>
);
