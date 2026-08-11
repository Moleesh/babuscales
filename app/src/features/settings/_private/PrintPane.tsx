import { useEffect, useState } from "react";

import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import type { DetectedPrinter } from "@engines/printers";
import { createPrinterSource } from "@engines/printers/createPrinterSource";

import { PRINTER_FIXTURES } from "../settingsSchema";
import type { PrinterKind, PrintersConfig } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./PrintPane.module.css";

// Module-level, not per-render — this is a stateless OS query, same
// reasoning as ConnectionsPane.tsx not recreating its indicator source on
// every render.
const printerSource = createPrinterSource();

const PRINTER_ROWS: readonly [key: keyof PrintersConfig, kind: PrinterKind, label: string][] = [
    ["A4", "a4", "Default · A4 laser / inkjet"],
    ["Mx", "mx", "Default · dot matrix"],
    ["Th", "th", "Default · thermal roll"],
];

// Print & printers pane (demo/BabuScales-demo.html's `data-pane="print"`) —
// the Printers section, plus a real addition the mock never had: "Detected
// printers" (task #52), reading Windows's own installed-printer list via
// `EnumPrintersW` (devices/printers.rs). window.print() (engines/print's
// per-ticket and bulk-report slips both use it) always opens the real OS
// print dialog, where the operator picks the actual target printer
// themselves — neither this app nor the mock can silently route output to
// one — so PRINTER_FIXTURES below stays what it always was: a *preference*
// naming which detected printer plays the "A4"/"Mx"/"Th" role, not a live
// binding. The mock's other card, "Print templates" (a New-template wizard
// with live preview), isn't ported: PLAN §21's roadmap table names the
// visual template designer as a Phase 8 item — "designed for, not built" —
// so it stays out of scope here; the three built-in layouts (A4/Thermal/
// Matrix, Tasks 23 & 26) are the only templates this build has.
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
            <Card
                title={<span className="lbl">Printers</span>}
                headerRight={<span className={styles.applied}>Applied immediately</span>}
            >
                <FieldGrid columns={3}>
                    {PRINTER_ROWS.map(([key, kind, label]) => (
                        <Field key={key} id={`prn-${key}`} label={{ en: label }}>
                            <select
                                id={`prn-${key}`}
                                value={printers[key]}
                                disabled={!unlocked}
                                onChange={(event) => setPrinter(key, event.target.value)}
                            >
                                {PRINTER_FIXTURES.filter((p) => p.kind === kind).map((p) => (
                                    <option key={p.name} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    ))}
                </FieldGrid>
            </Card>
            <Card
                title={<span className="lbl">Detected printers</span>}
                headerRight={<span className="chip num">{detected.length}</span>}
            >
                <div className={styles.body}>
                    <p className={styles.hint}>
                        Printers Windows currently has installed — the same list the OS print dialog
                        offers. Not available in this browser demo; the desktop app reads it from the
                        Windows print spooler.
                    </p>
                    <button
                        type="button"
                        className={styles.mini}
                        disabled={scanning}
                        onClick={rescan}
                    >
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
            <Card title={<span className="lbl">Print templates</span>}>
                <p className={styles.hint}>
                    A visual template designer (upload or build a custom layout with live preview)
                    is designed for but not built — PLAN marks it a Phase 8 item, deferred by
                    decision. Every ticket and report currently prints through one of three built-in
                    layouts (A4, thermal, dot-matrix), chosen automatically from paper size, not
                    authored here.
                </p>
            </Card>
        </div>
    );
};
