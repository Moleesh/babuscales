import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";

import { PRINTER_FIXTURES } from "../settingsSchema";
import type { PrinterKind, PrintersConfig } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./PrintPane.module.css";

const PRINTER_ROWS: readonly [key: keyof PrintersConfig, kind: PrinterKind, label: string][] = [
    ["A4", "a4", "Default · A4 laser / inkjet"],
    ["Mx", "mx", "Default · dot matrix"],
    ["Th", "th", "Default · thermal roll"],
];

// Print & printers pane (demo/BabuScales-demo.html's `data-pane="print"`) —
// the Printers section only. This is a stated preference, same as the
// mock's own: window.print() (engines/print's per-ticket and bulk-report
// slips both use it) always opens the real OS print dialog, where the
// operator picks the actual target printer themselves — neither this app
// nor the mock can silently route output to one. The mock's other card,
// "Print templates" (a New-template wizard with live preview), isn't
// ported: PLAN §21's roadmap table names the visual template designer as
// a Phase 8 item — "designed for, not built" — so it stays out of scope
// here; the three built-in layouts (A4/Thermal/Matrix, Tasks 23 & 26)
// are the only templates this build has.
export const PrintPane = () => {
    const { settings, unlocked, save } = useSettings();
    const printers = settings.Printers;

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
