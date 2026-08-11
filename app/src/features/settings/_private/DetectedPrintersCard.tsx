import { Card } from "@components/Card";
import type { DetectedPrinter } from "@engines/printers";

import styles from "./PrintPane.module.css";

export interface DetectedPrintersCardProps {
    detected: DetectedPrinter[];
    scanning: boolean;
    onRescan: () => void;
}

// Split out of PrintPane (over the line budget — docs/CodingStandards.md) —
// the "Detected printers" card, unchanged from the inline version it
// replaces.
export const DetectedPrintersCard = ({ detected, scanning, onRescan }: DetectedPrintersCardProps) => (
    <Card
        title={<span className="lbl">Detected printers</span>}
        headerRight={<span className="chip num">{detected.length}</span>}
    >
        <div className={styles.body}>
            <p className={styles.hint}>
                Printers Windows currently has installed — the same list the OS print dialog offers.
                Not available in this browser demo; the desktop app reads it from the Windows print
                spooler.
            </p>
            <button type="button" className={styles.mini} disabled={scanning} onClick={onRescan}>
                {scanning ? "Scanning…" : "Rescan"}
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
