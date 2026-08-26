import { AppModal } from "@components/AppModal";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/PrintTemplatesCard.module.css";
import type { PrintTemplate } from "./printTemplateTypes";
import { TemplatePreviewFrame } from "./TemplatePreviewFrame";

// AppModal's default "sheet" is 760px wide (AppModal.module.css) minus its
// own body padding — wide enough that a fixed 260px preview (the wizard's
// inline size) left most of the dialog empty (task: "make better use of the
// space"). 660 fills that sheet without the frame's border touching it.
const PREVIEW_MODAL_FIT_WIDTH_PX = 660;
// Taller than the 320px inline default — this modal has the room, and a
// short viewport made panning/scrolling feel cramped on an A4-shaped template.
const PREVIEW_MODAL_MAX_HEIGHT_PX = 520;

export interface PrintTemplatePreviewModalProps {
    /** null = closed — same "null means closed" shape as `editing` on the wizard, so the table's Preview button doesn't need a separate `open` flag. */
    template: PrintTemplate | null;
    onClose: () => void;
}

// The table row's own "Preview" button — read-only, no admin lock (task:
// "Print is going to be like fields": choosing/viewing stays open even
// where upload/edit/delete don't).
export const PrintTemplatePreviewModal = ({ template, onClose }: PrintTemplatePreviewModalProps) => {
    const { t } = useTranslation();
    if (!template) return null;

    return (
        <AppModal open title={`${t("settings.printTemplates.previewModalTitle")} — ${template.Name}`} onClose={onClose}>
            <div className={styles.previewSectionFull}>
                <TemplatePreviewFrame
                    html={template.Html}
                    widthMm={template.WidthMm}
                    heightMm={template.HeightMm}
                    marginMm={template.MarginMm}
                    fitWidthPx={PREVIEW_MODAL_FIT_WIDTH_PX}
                    maxHeightPx={PREVIEW_MODAL_MAX_HEIGHT_PX}
                    showZoomControls
                />
            </div>
        </AppModal>
    );
};
