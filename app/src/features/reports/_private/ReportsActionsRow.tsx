import { Button } from "@components/Button";
import { useTranslation } from "@i18n/useTranslation";

import { ExportMenu } from "./ExportMenu";
import styles from "../_styles/ReportsScreen.module.css";

export interface ReportsActionsRowProps {
    onPrint: () => void;
    onExportXlsx: () => void;
    onExportCsv: () => void;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Print/Export button row. Task: Reports
// rework, item 1 — CSV/Excel now sit behind one ExportMenu popover instead
// of two separate buttons; item 3 — this row itself now renders inside
// ReportsScreen's sticky bottom bar rather than inline in the card body.
// Task: "make print and export pdf button same as export" — Print no
// longer stands out as the one `primary` (orange) button in this row; the
// disabled Export PDF placeholder moved out of its own button into the
// Export dropdown itself (ExportMenu.tsx), next to the two real formats.
export const ReportsActionsRow = ({
    onPrint,
    onExportXlsx,
    onExportCsv,
}: ReportsActionsRowProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.actions}>
            <Button onClick={onPrint}>{t("reports.print")}</Button>
            <ExportMenu onExportXlsx={onExportXlsx} onExportCsv={onExportCsv} />
        </div>
    );
};
