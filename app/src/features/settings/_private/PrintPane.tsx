import { useEffect, useState } from "react";

import { Card } from "@components/Card";
import type { DetectedPrinter } from "@engines/printers";
import { createPrinterSource } from "@engines/printers/createPrinterSource";

import type { PrintersConfig } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./_styles/PrintPane.module.css";
import { DetectedPrintersCard } from "./DetectedPrintersCard";
import { PrinterFixturesCard } from "./PrinterFixturesCard";

// Module-level, not per-render — this is a stateless OS query, same
// reasoning as ConnectionsPane.tsx not recreating its indicator source on
// every render.
const printerSource = createPrinterSource();

// The mock's other card, "Print templates" (a New-template wizard with live
// preview), isn't ported: PLAN §21's roadmap table names the visual
// template designer as a Phase 8 item — "designed for, not built" — so it
// stays out of scope here; the three built-in layouts (A4/Thermal/Matrix,
// Tasks 23 & 26) are the only templates this build has. Static markup, so
// it's a module constant rather than JSX inside the component body.
const TEMPLATES_CARD = (
    <Card title={<span className="lbl">Print templates</span>}>
        <p className={styles.hint}>
            A visual template designer (upload or build a custom layout with live preview) is
            designed for but not built — PLAN marks it a Phase 8 item, deferred by decision. Every
            ticket and report currently prints through one of three built-in layouts (A4, thermal,
            dot-matrix), chosen automatically from paper size, not authored here.
        </p>
    </Card>
);

// Print & printers pane (demo/BabuScales-demo.html's `data-pane="print"`) —
// the Printers section, plus a real addition the mock never had: "Detected
// printers" (task #52), reading Windows's own installed-printer list via
// `EnumPrintersW` (devices/printers.rs). window.print() (engines/print's
// per-ticket and bulk-report slips both use it) always opens the real OS
// print dialog, where the operator picks the actual target printer
// themselves — neither this app nor the mock can silently route output to
// one — so PRINTER_FIXTURES (PrinterFixturesCard) stays what it always was:
// a *preference* naming which detected printer plays the "A4"/"Mx"/"Th"
// role, not a live binding.
export const PrintPane = () => {
    const { settings, unlocked, save } = useSettings();
    const printers = settings.Printers;
    const [detected, setDetected] = useState<DetectedPrinter[]>([]);
    const [scanning, setScanning] = useState(false);

    const rescan = (): void => {
        setScanning(true);
        void printerSource
            .listPrinters()
            .then(setDetected)
            .finally(() => setScanning(false));
    };

    useEffect(rescan, []);

    const setPrinter = (key: keyof PrintersConfig, value: string): void => {
        void save({ ...settings, Printers: { ...printers, [key]: value } });
    };

    return (
        <div className={styles.grid}>
            <PrinterFixturesCard printers={printers} unlocked={unlocked} onChange={setPrinter} />
            <DetectedPrintersCard detected={detected} scanning={scanning} onRescan={rescan} />
            {TEMPLATES_CARD}
        </div>
    );
};
