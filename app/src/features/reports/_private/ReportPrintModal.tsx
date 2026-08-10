import { useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import type { PaperKind, ReportSlipData } from "@engines/print";
import { renderReportMatrixSlip, renderReportThermalSlip } from "@engines/print";

import { ReportA4 } from "./ReportA4";
import styles from "./ReportPrintModal.module.css";

const PAPER_OPTIONS: SegmentedOption<PaperKind>[] = [
    { value: "a4", label: "A4" },
    { value: "th", label: "Thermal · 80mm" },
    { value: "mx", label: "Dot matrix" },
];

const PAPER_META: Record<PaperKind, string> = {
    a4: "A4 · single sheet",
    th: "80 mm thermal roll",
    mx: "Continuous dot-matrix",
};

export interface ReportPrintModalProps {
    open: boolean;
    onClose: () => void;
    data: ReportSlipData;
}

// The bulk-print sibling of weighing/_private/PrintPreviewModal.tsx — same
// "one content model, three layout engines" shape (ReportSlipData here
// instead of SlipData), same `#print-slip` scoped-print trick
// (module.css's own `@media print` rule). Unlike the ticket slip, there's
// no PrintCount to bump on "Send to printer" — a report isn't a doc row,
// so this just prints and closes.
export const ReportPrintModal = ({ open, onClose, data }: ReportPrintModalProps) => {
    const [paper, setPaper] = useState<PaperKind>("a4");

    const send = (): void => {
        window.print();
        onClose();
    };

    return (
        <AppModal
            open={open}
            title={
                <>
                    Print preview
                    <span className={`chip ${styles.doc}`}>{data.Title}</span>
                </>
            }
            onClose={onClose}
        >
            <div className={styles.body}>
                <SegmentedControl
                    options={PAPER_OPTIONS}
                    value={paper}
                    onChange={setPaper}
                    ariaLabel="Paper size"
                />
                {paper === "a4" && (
                    <div id="print-slip">
                        <ReportA4 data={data} />
                    </div>
                )}
                {paper === "th" && (
                    <pre id="print-slip" className={`${styles.mono} ${styles.thermal}`}>
                        {renderReportThermalSlip(data)}
                    </pre>
                )}
                {paper === "mx" && (
                    <pre id="print-slip" className={styles.mono}>
                        {renderReportMatrixSlip(data)}
                    </pre>
                )}
                <div className={styles.footer}>
                    <span className={styles.meta}>{PAPER_META[paper]}</span>
                    <div className={styles.actions}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={send}>
                            Send to printer
                        </Button>
                    </div>
                </div>
            </div>
        </AppModal>
    );
};
