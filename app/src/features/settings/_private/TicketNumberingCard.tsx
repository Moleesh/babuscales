import { Card } from "@components/Card";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody, TicketNumbering } from "../settingsSchema";
import styles from "./_styles/SystemPane.module.css";
import { NumberingAutoResetFields } from "./NumberingAutoResetFields";
import { NumberingPrefixFields } from "./NumberingPrefixFields";
import { NumberingResetRow } from "./NumberingResetRow";

export interface TicketNumberingCardProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    onResetTicketSeries: () => Promise<void>;
}

// Split out of SystemPane (over the line budget — docs/CodingStandards.md)
// — ticket numbering (live: prefix/width write straight through
// `formatTicketNo`, Reset actually calls `DataPort.resetDocSeries`),
// unchanged from the inline version it replaces. Further split into
// NumberingPrefixFields/NumberingResetRow/NumberingAutoResetFields, each
// still over its own budget on its own.
export const TicketNumberingCard = ({
    settings,
    unlocked,
    onSave,
    onResetTicketSeries,
}: TicketNumberingCardProps) => {
    const { t } = useTranslation();
    const numbering = settings.Numbering;
    const setNumbering = (next: TicketNumbering): void =>
        onSave({ ...settings, Numbering: next });

    return (
        <Card title={<span className="lbl">{t("settings.ticketNumbering.title")}</span>}>
            <div className={styles.body}>
                <NumberingPrefixFields numbering={numbering} unlocked={unlocked} onChange={setNumbering} />
                <NumberingResetRow unlocked={unlocked} onResetTicketSeries={onResetTicketSeries} />
                <NumberingAutoResetFields numbering={numbering} unlocked={unlocked} onChange={setNumbering} />
            </div>
        </Card>
    );
};
