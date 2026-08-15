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
            {/* `style`, not a new CSS class — Button's own caption has no
                width limit, so this button's long one-line caption sentence
                stretched it wide enough to dominate the row next to Print/
                Export (reported: "not that good", layout/spacing). Capping
                the width lets the caption wrap to two lines instead, back
                in scale with its neighbours. */}
            <Button disabled caption={t("reports.exportPdfCaption")} style={{ maxWidth: 200 }}>
                {t("reports.exportPdf")}
            </Button>
            <ExportMenu onExportXlsx={onExportXlsx} onExportCsv={onExportCsv} />
        </div>
    );
};
