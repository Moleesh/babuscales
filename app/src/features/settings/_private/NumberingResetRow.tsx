import styles from "./_styles/SystemPane.module.css";
import { useTicketNumberReset } from "./useTicketNumberReset";

export interface NumberingResetRowProps {
    unlocked: boolean;
    onResetTicketSeries: () => Promise<void>;
}

// Split out of TicketNumberingCard (over the line budget — docs/CodingStandards.md)
// — the "Reset the counter now" confirm row, unchanged from the inline
// version it replaces.
export const NumberingResetRow = ({ unlocked, onResetTicketSeries }: NumberingResetRowProps) => {
    const { confirmingReset, resetting, confirm, cancel, handleReset } =
        useTicketNumberReset(onResetTicketSeries);

    return (
        <div className={styles.confirmRow}>
            {confirmingReset ? (
                <>
                    <span>Reset the counter now? The next ticket saved starts a fresh series.</span>
                    <button
                        type="button"
                        className={`${styles.mini} ${styles.danger}`}
                        disabled={resetting}
                        onClick={() => void handleReset()}
                    >
                        {resetting ? "Resetting…" : "Yes, reset"}
                    </button>
                    <button type="button" className={styles.mini} disabled={resetting} onClick={cancel}>
                        Cancel
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    className={`${styles.mini} ${styles.danger}`}
                    disabled={!unlocked}
                    onClick={confirm}
                >
                    Reset the counter now
                </button>
            )}
        </div>
    );
};
