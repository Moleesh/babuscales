import { Button } from "@components/Button";

import styles from "../_styles/ReportsScreen.module.css";

export interface ReportsActionsRowProps {
    onPrint: () => void;
    onExportXlsx: () => void;
    onExportCsv: () => void;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Print/Export button row, unchanged from
// the inline version it replaces.
export const ReportsActionsRow = ({ onPrint, onExportXlsx, onExportCsv }: ReportsActionsRowProps) => (
    <div className={styles.actions}>
        <Button variant="primary" onClick={onPrint}>
            Print
        </Button>
        <Button disabled caption="Use Print → Save as PDF from the OS print dialog">
            Export PDF
        </Button>
        <Button onClick={onExportXlsx}>Export Excel</Button>
        <Button onClick={onExportCsv}>Export CSV</Button>
    </div>
);
