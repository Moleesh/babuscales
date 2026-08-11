import { useSettings } from "../useSettings";
import { BackupRestoreCard } from "./BackupRestoreCard";
import { DailySummaryCard } from "./DailySummaryCard";
import { DateTimeFormatsCard } from "./DateTimeFormatsCard";
import { LegacyImportCard } from "./LegacyImportCard";
import { LicenceCard } from "./LicenceCard";
import styles from "./SystemPane.module.css";
import { TicketNumberingCard } from "./TicketNumberingCard";

export interface SystemPaneProps {
    /** `DataPort.resetDocSeries`'s first two args — wired at the App level, since Settings has no direct DataPort call of its own otherwise. */
    onResetTicketSeries: () => Promise<void>;
}

// System pane (demo/BabuScales-demo.html's `data-pane="sys"`) — composes the
// six cards below; each owns its own local state (see its own file for
// what it does and why).
export const SystemPane = ({ onResetTicketSeries }: SystemPaneProps) => {
    const { settings, unlocked, save, changeAdminPassword } = useSettings();

    return (
        <div className={styles.grid}>
            <TicketNumberingCard
                settings={settings}
                unlocked={unlocked}
                onSave={(next) => void save(next)}
                onResetTicketSeries={onResetTicketSeries}
            />
            <DateTimeFormatsCard
                settings={settings}
                unlocked={unlocked}
                onSave={(next) => void save(next)}
                changeAdminPassword={changeAdminPassword}
            />
            <DailySummaryCard />
            <BackupRestoreCard />
            <LegacyImportCard />
            <LicenceCard />
        </div>
    );
};
