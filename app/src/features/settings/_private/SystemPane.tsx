import { useSettings } from "../useSettings";
import styles from "./_styles/SystemPane.module.css";
import { AmountAndAdminPasswordCard } from "./AmountAndAdminPasswordCard";
import { BackupRestoreCard } from "./BackupRestoreCard";
import { DailySummaryCard } from "./DailySummaryCard";
import { LegacyImportCard } from "./LegacyImportCard";
import { LicenceCard } from "./LicenceCard";

// System pane (demo/BabuScales-demo.html's `data-pane="sys"`) — composes the
// cards below; each owns its own local state (see its own file for what it
// does and why). Ticket numbering and date/time formats moved to WeighingPane
// by request — they're about the weighing flow, not generic system config.
// The expression-index manager was removed entirely (feature not needed).
export const SystemPane = () => {
    const { settings, unlocked, save, changeAdminPassword } = useSettings();

    return (
        <div className={styles.grid}>
            <AmountAndAdminPasswordCard
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
