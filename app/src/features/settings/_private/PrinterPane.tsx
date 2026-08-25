import { useEffect, useState } from "react";

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

// Printer pane (demo/BabuScales-demo.html's `data-pane="print"`'s Printers
// section) — a real addition the mock never had: "Detected printers",
// reading Windows's own installed-printer list via `EnumPrintersW`
// (devices/printers.rs). window.print() (engines/print's per-ticket and
// bulk-report slips both use it) always opens the real OS print dialog,
// where the operator picks the actual target printer themselves — neither
// this app nor the mock can silently route output to one — so
// PRINTER_FIXTURES (PrinterFixturesCard) stays what it always was: a
// *preference* naming which detected printer plays the "A4"/"Mx"/"Th" role,
// not a live binding. The old "Print templates" card that used to sit here
// moved to the Fields & Print tab (task: "we need business and appearance /
// field and print / language / printer" — the Settings tab bar regrouping
// this session) — a template governs the ticket schema, not a printer
// device, so it reads more naturally there now that the two are separate
// tabs.
export const PrinterPane = () => {
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
        </div>
    );
};
