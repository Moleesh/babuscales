import { useEffect, useRef, useState } from "react";

import { Button } from "@components/Button";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ExportMenu.module.css";

export interface ExportMenuProps {
    onExportXlsx: () => void;
    onExportCsv: () => void;
}

// Task: Reports rework, item 1 — one "Export ▾" trigger over a small
// popover of the two real formats (Excel/CSV, reportExport.ts's own hand-
// rolled writers, unchanged), replacing what used to be two separate
// buttons in ReportsActionsRow. Closes on an outside click or Escape, the
// same shape as AppModal's own backdrop-click-to-close.
export const ExportMenu = ({ onExportXlsx, onExportCsv }: ExportMenuProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const pick = (action: () => void): void => {
        action();
        setOpen(false);
    };

    return (
        <div className={styles.root} ref={rootRef}>
            <Button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {t("reports.export")} ▾
            </Button>
            {open && (
                <div className={styles.menu} role="menu">
                    <button
                        type="button"
                        role="menuitem"
                        className={styles.item}
                        onClick={() => pick(onExportXlsx)}
                    >
                        {t("reports.exportExcel")}
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        className={styles.item}
                        onClick={() => pick(onExportCsv)}
                    >
                        {t("reports.exportCsv")}
                    </button>
                    {/* Not a real export path — the OS print dialog's own
                        "Save as PDF" already covers it (ReportsActionsRow's
                        own prior comment, same reasoning, just relocated
                        here out of its own standalone button). Disabled,
                        informational only. */}
                    <button type="button" role="menuitem" className={styles.item} disabled>
                        {t("reports.exportPdf")}
                        <small className={styles.itemCaption}>{t("reports.exportPdfCaption")}</small>
                    </button>
                </div>
            )}
        </div>
    );
};
