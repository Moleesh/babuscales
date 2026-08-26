import { Card } from "@components/Card";
import { Field } from "@components/Field";
import { Select } from "@components/Select";
import type { DetectedPrinter } from "@engines/printers";
import { useTranslation } from "@i18n/useTranslation";

import { PRINT_TO_PDF_VALUE } from "../settingsSchema";
import type { PrintersConfig } from "../settingsSchema";
import styles from "./_styles/PrintPane.module.css";

export interface PrintOptionsCardProps {
    printers: PrintersConfig;
    detected: DetectedPrinter[];
    scanning: boolean;
    onRescan: () => void;
    onChangeDefaultPrinter: (value: string) => void;
    onChangeCopies: (value: number) => void;
    onChangeShowDialog: (value: boolean) => void;
}

// Task: "we need other print option like no of paper and print dialog box
// these has to go to the printer session" — copies + whether the OS print
// dialog shows before printing, both per-machine hardware/session choices,
// live next to the printer pick rather than on a print template (a template
// is shared/portable layout, not a per-session preference). Task: "we can
// call the second half print preference" — titled "Print preferences"
// rather than "Print options" to match, since it anchors the whole right
// half of PrinterPane. Task: "move printers in side print preferences" —
// folded the old standalone DefaultPrinterCard's dropdown + rescan button in
// here too, so the right half is a single card instead of two stacked ones;
// same "no admin needed" reasoning DefaultPrinterCard had (a per-machine
// hardware pick, not a shared operational rule) — this card as a whole stays
// unlocked-gate-free.
export const PrintOptionsCard = ({
    printers,
    detected,
    scanning,
    onRescan,
    onChangeDefaultPrinter,
    onChangeCopies,
    onChangeShowDialog,
}: PrintOptionsCardProps) => {
    const { t } = useTranslation();
    const osDefault = detected.find((p) => p.IsDefault)?.Name ?? "";
    const printerValue = printers.Default || osDefault;
    const printerOptions = [
        ...detected.map((p) => ({
            value: p.Name,
            label: p.IsDefault ? `${p.Name} — ${t("settings.printers.osDefaultBadge")}` : p.Name,
        })),
        { value: PRINT_TO_PDF_VALUE, label: t("settings.printers.pdfOption") },
    ];

    return (
        <Card
            title={<span className="lbl">{t("settings.printOptions.title")}</span>}
            headerRight={
                <button type="button" className={styles.mini} disabled={scanning} onClick={onRescan}>
                    {scanning ? t("settings.printers.scanning") : t("settings.printers.rescan")}
                </button>
            }
        >
            <div className={styles.body}>
                <p className={styles.hint}>{t("settings.printers.defaultHint")}</p>
                <Field id="prn-default" label={t("settings.printers.defaultLabel")}>
                    <Select id="prn-default" value={printerValue} options={printerOptions} onChange={onChangeDefaultPrinter} />
                </Field>
                <label className={styles.copiesRow}>
                    <span>{t("settings.printOptions.copies")}</span>
                    <input
                        type="number"
                        min={1}
                        className={styles.copiesInput}
                        value={printers.Copies}
                        onChange={(event) => onChangeCopies(Math.max(1, Number(event.target.value) || 1))}
                    />
                </label>
                <label className={styles.ck}>
                    <input
                        type="checkbox"
                        checked={printers.ShowPrintDialog}
                        onChange={(event) => onChangeShowDialog(event.target.checked)}
                    />
                    <span>{t("settings.printOptions.showDialog")}</span>
                </label>
            </div>
        </Card>
    );
};
