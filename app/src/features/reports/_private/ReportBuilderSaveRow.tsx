import { Button } from "@components/Button";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";

export interface ReportBuilderSaveRowProps {
    newReportName: string;
    onNewReportNameChange: (name: string) => void;
    onSaveReport: () => void;
}

// Split out of ReportBuilderModal (over the line/complexity budget —
// docs/CodingStandards.md) — the "save current picks as a named report"
// row, wired to the same useSavedReportActions the always-visible
// SavedReportsRow uses. The modal's own Done/Finish button moved to
// ReportBuilderNav once the builder became a step wizard (task: Reports
// rework — "guided wizard, not a flat page").
export const ReportBuilderSaveRow = ({
    newReportName,
    onNewReportNameChange,
    onSaveReport,
}: ReportBuilderSaveRowProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.saveRow}>
            <input
                className={styles.saveInput}
                value={newReportName}
                onChange={(event) => onNewReportNameChange(event.target.value)}
                placeholder={t("reports.savedReportsPlaceholder")}
                aria-label={t("reports.savedReportsNewAriaLabel")}
            />
            <Button disabled={!newReportName.trim()} onClick={onSaveReport}>
                {t("reports.savedReportsSave")}
            </Button>
        </div>
    );
};
