import { useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import type { PaperKind, SlipData } from "@engines/print";
import { renderMatrixSlip, renderThermalSlip } from "@engines/print";

import styles from "./PrintPreviewModal.module.css";
import { SlipA4 } from "./SlipA4";

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

// The three paper renderers, switched on the live SegmentedControl choice —
// pulled out of the modal body so that function reads as "the chrome around
// a preview" rather than the preview's own if/else ladder.
const PrintSlipPreview = ({ paper, data }: { paper: PaperKind; data: SlipData }) => {
    if (paper === "a4") {
        return (
            <div id="print-slip">
                <SlipA4 data={data} />
            </div>
        );
    }
    return (
        <pre id="print-slip" className={`${styles.mono} ${paper === "th" ? styles.thermal : ""}`}>
            {paper === "th" ? renderThermalSlip(data) : renderMatrixSlip(data)}
        </pre>
    );
};

export interface PrintPreviewModalProps {
    open: boolean;
    onClose: () => void;
    data: SlipData;
    /** Commits the print: increments `PrintCount` and re-saves — called right after `window.print()`, same "optimistic" order the mock's own `sendToPrinter` uses (there is no real driver feedback to wait for). */
    onSend: () => void;
    sending: boolean;
}

// Ported from the mock's `#modal` print-preview sheet — one content model
// (SlipData), three paper renderers (PAPER_OPTIONS), a live switch between
// them, and a "Send to printer" that scopes the OS print dialog to just the
// rendered slip via PrintPreviewModal.module.css's `@media print` rule.
export const PrintPreviewModal = ({
    open,
    onClose,
    data,
    onSend,
    sending,
}: PrintPreviewModalProps) => {
    const [paper, setPaper] = useState<PaperKind>("a4");

    const send = (): void => {
        window.print();
        onSend();
        onClose();
    };

    return (
        <AppModal
            open={open}
            title={
                <>
                    Print preview
                    <span className={`chip ${styles.doc}`}>
                        {data.TicketNo}
                        {data.Copy ? ` · ${data.Copy}` : ""}
                    </span>
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
                <PrintSlipPreview paper={paper} data={data} />
                <div className={styles.footer}>
                    <span className={styles.meta}>{PAPER_META[paper]}</span>
                    <div className={styles.actions}>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button variant="primary" disabled={sending} onClick={send}>
                            Send to printer
                        </Button>
                    </div>
                </div>
            </div>
        </AppModal>
    );
};
