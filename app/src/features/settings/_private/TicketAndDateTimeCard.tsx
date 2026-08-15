import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody, TicketNumbering } from "../settingsSchema";
import styles from "./_styles/SystemPane.module.css";
import { DateTimeFormatFields } from "./DateTimeFormatFields";
import { NumberingPrefixFields } from "./NumberingPrefixFields";
import { NumberingResetRow } from "./NumberingResetRow";

export interface TicketAndDateTimeCardProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    /** Resolves with the new `Epoch` — wrapped below (`handleResetTicketSeries`) into the `(startSeq: number) => Promise<void>` NumberingResetRow/useTicketNumberReset actually need, persisting the epoch into `Numbering.CurrentEpoch` along the way. */
    onResetTicketSeries: (startSeq: number) => Promise<{ Epoch: number }>;
}

// Merged by request — ticket numbering and date & time were two separate
// cards stacked in the same column (WeighingPane's column 2); folded into
// one card with a divider between the two field groups instead, since they
// were always meant to sit together. Replaces the old, now-deleted
// TicketNumberingCard/DateTimeFormatsCard.
export const TicketAndDateTimeCard = ({
    settings,
    unlocked,
    onSave,
    onResetTicketSeries,
}: TicketAndDateTimeCardProps) => {
    const { t } = useTranslation();
    const numbering = settings.Numbering;
    const setNumbering = (next: TicketNumbering): void => onSave({ ...settings, Numbering: next });

    // Bumping the counter's epoch is only half of "reset" — the other half
    // is telling Reports what "current" now means, so old-series tickets
    // fall out of its default view (reportRows.ts's filterRowsBySeries).
    // NumberingResetRow/useTicketNumberReset only know `() => Promise<void>`
    // (confirm/cancel/resetting UI state, nothing epoch-shaped), so this
    // wraps the real reset and stores its returned `Epoch` before handing
    // back that plain shape.
    const handleResetTicketSeries = async (startSeq: number): Promise<void> => {
        const { Epoch } = await onResetTicketSeries(startSeq);
        onSave({ ...settings, Numbering: { ...numbering, CurrentEpoch: Epoch } });
    };

    return (
        <Card
            title={<span className="lbl">{t("settings.ticketNumbering.title")}</span>}
            headerRight={<span className={styles.applied}>{t("settings.weighingRules.appliedImmediately")}</span>}
        >
            <div className={styles.body}>
                <NumberingPrefixFields numbering={numbering} unlocked={unlocked} onChange={setNumbering} />
                <NumberingResetRow unlocked={unlocked} onResetTicketSeries={handleResetTicketSeries} />
            </div>
            <div className={styles.divider} />
            <div className={styles.body}>
                <span className="lbl">{t("settings.dateTimeFormats.title")}</span>
                <DateTimeFormatFields settings={settings} unlocked={unlocked} onSave={onSave} />
            </div>
        </Card>
    );
};
