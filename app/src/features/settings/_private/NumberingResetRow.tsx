import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/SystemPane.module.css";
import { useTicketNumberReset } from "./useTicketNumberReset";

export interface NumberingResetRowProps {
    unlocked: boolean;
    onResetTicketSeries: (startSeq: number) => Promise<void>;
}

// Split out of TicketNumberingCard (over the line budget — docs/CodingStandards.md)
// — the "Reset the counter now" confirm row. Confirm copy routed through
// `t()` (task: fresh-series reset) — a stronger warning than the original
// one-liner, spelling out that this starts a brand-new series, old tickets
// survive, and Reports hides them by default afterward (reportRows.ts's
// filterRowsBySeries, ReportsDateRangeRow's "include backed" toggle).
export const NumberingResetRow = ({ unlocked, onResetTicketSeries }: NumberingResetRowProps) => {
    const { t } = useTranslation();
    const { confirmingReset, resetting, startSeq, setStartSeq, confirm, cancel, handleReset } =
        useTicketNumberReset(onResetTicketSeries);

    return (
        <div className={styles.confirmRow}>
            {confirmingReset ? (
                <>
                    <span>{t("settings.numbering.resetConfirm")}</span>
                    <label className={styles.startSeqLabel}>
                        <span>{t("settings.numbering.resetStartAt")}</span>
                        <input
                            type="number"
                            min="1"
                            className={styles.startSeqInput}
                            value={startSeq}
                            disabled={resetting}
                            onChange={(event) => setStartSeq(Number(event.target.value) || 1)}
                        />
                    </label>
                    <button
                        type="button"
                        className={`${styles.mini} ${styles.danger}`}
                        disabled={resetting}
                        onClick={() => void handleReset()}
                    >
                        {resetting ? t("settings.numbering.resetResetting") : t("settings.numbering.resetYes")}
                    </button>
                    <button type="button" className={styles.mini} disabled={resetting} onClick={cancel}>
                        {t("settings.numbering.resetCancel")}
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    className={`${styles.mini} ${styles.danger}`}
                    disabled={!unlocked}
                    onClick={confirm}
                >
                    {t("settings.numbering.resetNow")}
                </button>
            )}
        </div>
    );
};
