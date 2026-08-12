import { Button } from "@components/Button";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";

export interface ReportsActionsRowProps {
    onPrint: () => void;
    onExportXlsx: () => void;
    onExportCsv: () => void;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Print/Export button row, unchanged from
// the inline version it replaces.
export const ReportsActionsRow = ({
    onPrint,
    onExportXlsx,
    onExportCsv,
}: ReportsActionsRowProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.actions}>
            <Button variant="primary" onClick={onPrint}>
                {t("reports.print")}
            </Button>
            <Button disabled caption={t("reports.exportPdfCaption")}>
                {t("reports.exportPdf")}
            </Button>
            <Button onClick={onExportXlsx}>{t("reports.exportExcel")}</Button>
            <Button onClick={onExportCsv}>{t("reports.exportCsv")}</Button>
        </div>
    );
};
