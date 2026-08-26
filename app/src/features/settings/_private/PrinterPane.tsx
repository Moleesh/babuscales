import { useEffect, useState } from "react";

import type { DetectedPrinter } from "@engines/printers";
import { createPrinterSource } from "@engines/printers/createPrinterSource";

import { useSettings } from "../useSettings";
import styles from "./_styles/PrintPane.module.css";
import { PrintOptionsCard } from "./PrintOptionsCard";
import { PrintTemplatesCard } from "./PrintTemplatesCard";

// Module-level, not per-render — this is a stateless OS query, same
// reasoning as ConnectionsPane.tsx not recreating its indicator source on
// every render.
const printerSource = createPrinterSource();

// Print pane (demo/BabuScales-demo.html's `data-pane="print"`'s Printers
// section) — a real addition the mock never had: reading Windows's own
// installed-printer list via `EnumPrintersW` (devices/printers.rs).
// Task: "list all the printers... We don't want 3 different ones. We'll
// just use one dropdown to list everything" — replaced the old three-way
// A4/Mx/Th PRINTER_FIXTURES assignment plus a separate read-only
// "Detected printers" list with a single DefaultPrinterCard: one dropdown,
// every detected printer plus a synthetic "Print to PDF" entry, preselected
// on the OS's own default (`DetectedPrinter.isDefault`) until an operator
// picks something else.
//
// Task: "printer and print should be in same place both dont need admin" —
// PrintTemplatesCard moved here from Fields & Print; task "print template
// should come first" put it above the printer dropdown, and the tab itself
// was renamed "Printer" → "Print" to match.
//
// TicketAndDateTimeCard has bounced in and out of this tab a few times
// (split to its own "ticket" tab, merged back in, split out again per
// "move out ticket") — it's back in its own tab (TicketPane.tsx) for good
// reason this time: it's the one card here that stays admin-gated
// ("ticket need admin"), unlike PrintTemplatesCard/DefaultPrinterCard, so
// this pane is now purely the admin-free printer/device+template config.
export const PrinterPane = () => {
    const { settings, save } = useSettings();
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

    const setDefaultPrinter = (value: string): void => {
        void save({ ...settings, Printers: { ...printers, Default: value } });
    };
    const setCopies = (value: number): void => {
        void save({ ...settings, Printers: { ...printers, Copies: value } });
    };
    const setShowPrintDialog = (value: boolean): void => {
        void save({ ...settings, Printers: { ...printers, ShowPrintDialog: value } });
    };

    // Task: "print templates should cover first half and other setting the
    // second half" — PrintTemplatesCard is the left half of the pane (fills
    // the pane's full height, PrintTemplatesCard.module.css's own doc
    // comment); the right half is `.sessionRow`. Task: "move printers in
    // side print preferences" folded the old separate DefaultPrinterCard
    // into PrintOptionsCard, so the right half is now that one card alone.
    return (
        <div className={styles.grid}>
            <PrintTemplatesCard />
            <div className={styles.sessionRow}>
                <PrintOptionsCard
                    printers={printers}
                    detected={detected}
                    scanning={scanning}
                    onRescan={rescan}
                    onChangeDefaultPrinter={setDefaultPrinter}
                    onChangeCopies={setCopies}
                    onChangeShowDialog={setShowPrintDialog}
                />
            </div>
        </div>
    );
};
