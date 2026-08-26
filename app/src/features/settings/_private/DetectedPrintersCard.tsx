import { Card } from "@components/Card";
import type { DetectedPrinter } from "@engines/printers";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/PrintPane.module.css";

export interface DetectedPrintersCardProps {
    detected: DetectedPrinter[];
    scanning: boolean;
    onRescan: () => void;
}

// Split out of PrintPane (over the line budget — docs/CodingStandards.md) —
// the "Detected printers" card, unchanged from the inline version it
// replaces.
export const DetectedPrintersCard = ({ detected, scanning, onRescan }: DetectedPrintersCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            sticky
            title={<span className="lbl">{t("settings.printers.detectedTitle")}</span>}
            headerRight={<span className="chip num">{detected.length}</span>}
        >
            <div className={styles.body}>
                <p className={styles.hint}>{t("settings.printers.detectedHint")}</p>
                <button type="button" className={styles.mini} disabled={scanning} onClick={onRescan}>
                    {scanning ? t("settings.printers.scanning") : t("settings.printers.rescan")}
                </button>
                {detected.length > 0 && (
                    <ul className={styles.detectedList}>
                        {detected.map((printer) => (
                            <li key={printer.name}>{printer.name}</li>
                        ))}
                    </ul>
                )}
            </div>
        </Card>
    );
};
