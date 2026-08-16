import { useEffect, useState } from "react";

import { Card } from "@components/Card";
import type { DetectedPrinter } from "@engines/printers";
import { createPrinterSource } from "@engines/printers/createPrinterSource";
import { useTranslation } from "@i18n/useTranslation";

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
// preview), isn't ported: the roadmap names the visual
// template designer as a later item — "designed for, not built" — so it
// stays out of scope here; the three built-in layouts (A4/Thermal/Matrix)
// are the only templates this build has. `t`-threaded (mirrors ruleDefs(t) in settingsSchema.ts) since it
// needs to re-render on language change — no longer a static module constant.
const templatesCard = (t: (key: string) => string) => (
    <Card title={<span className="lbl">{t("settings.printTemplates.title")}</span>}>
        <p className={styles.hint}>{t("settings.printTemplates.hint")}</p>
    </Card>
);

// Print & printers pane (demo/BabuScales-demo.html's `data-pane="print"`) —
// the Printers section, plus a real addition the mock never had: "Detected
// printers", reading Windows's own installed-printer list via
// `EnumPrintersW` (devices/printers.rs). window.print() (engines/print's
// per-ticket and bulk-report slips both use it) always opens the real OS
// print dialog, where the operator picks the actual target printer
// themselves — neither this app nor the mock can silently route output to
// one — so PRINTER_FIXTURES (PrinterFixturesCard) stays what it always was:
// a *preference* naming which detected printer plays the "A4"/"Mx"/"Th"
// role, not a live binding.
export const PrintPane = () => {
    const { settings, unlocked, save } = useSettings();
    const { t } = useTranslation();
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
            {templatesCard(t)}
        </div>
    );
};
