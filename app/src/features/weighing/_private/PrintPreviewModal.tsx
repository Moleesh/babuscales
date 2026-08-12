import { useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import type { PaperKind, SlipData } from "@engines/print";
import { renderMatrixSlip, renderThermalSlip } from "@engines/print";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/PrintPreviewModal.module.css";
import { SlipA4 } from "./SlipA4";

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
    const { t } = useTranslation();
    const [paper, setPaper] = useState<PaperKind>("a4");

    const PAPER_OPTIONS: SegmentedOption<PaperKind>[] = [
        { value: "a4", label: t("weigh.paperA4") },
        { value: "th", label: t("weigh.paperThermal") },
        { value: "mx", label: t("weigh.paperMatrix") },
    ];

    const PAPER_META: Record<PaperKind, string> = {
        a4: t("weigh.paperMetaA4"),
        th: t("weigh.paperMetaThermal"),
        mx: t("weigh.paperMetaMatrix"),
    };

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
                    {t("weigh.printPreview")}
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
                    ariaLabel={t("weigh.paperSize")}
                />
                <PrintSlipPreview paper={paper} data={data} />
                <div className={styles.footer}>
                    <span className={styles.meta}>{PAPER_META[paper]}</span>
                    <div className={styles.actions}>
                        <Button onClick={onClose}>{t("weigh.cancel")}</Button>
                        <Button variant="primary" disabled={sending} onClick={send}>
                            {t("weigh.sendToPrinter")}
                        </Button>
                    </div>
                </div>
            </div>
        </AppModal>
    );
};
