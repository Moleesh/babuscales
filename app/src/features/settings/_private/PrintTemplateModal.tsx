import { useEffect, useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/PrintTemplatesCard.module.css";
import { PrintTemplateDetailFields } from "./PrintTemplateDetailFields";
import { PrintTemplateHtmlFields } from "./PrintTemplateHtmlFields";
import type { PrintTemplate, PrintTemplateDraft } from "./printTemplateTypes";
import { blankTemplateDraft } from "./printTemplateTypes";

export interface PrintTemplateModalProps {
    open: boolean;
    /** null = adding a new template; a template = editing it (its Html/dims prefill the form, `Id` carries through to the save). */
    editing: PrintTemplate | null;
    onClose: () => void;
    onSave: (draft: PrintTemplateDraft & { Id?: string }) => Promise<void>;
}

// Task: "let add template be a single pop no need it as wizard" — one form,
// one Save, replacing the old two-step PrintTemplateWizardModal. HTML
// (upload/paste) and Name/Width/Height/Margin/preview are just two field
// groups in the same scroll, not separate steps — editing an existing
// template still reopens this prefilled, same as the wizard did.
export const PrintTemplateModal = ({ open, editing, onClose, onSave }: PrintTemplateModalProps) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<PrintTemplateDraft>(blankTemplateDraft());
    const [saving, setSaving] = useState(false);

    // Re-seed on every open (not just mount) — reopening for a different
    // template, or reopening "Add" after a previous edit, must not carry the
    // last session's draft over.
    useEffect(() => {
        if (!open) return;
        setDraft(editing ?? blankTemplateDraft());
    }, [open, editing]);

    const patch = (next: Partial<PrintTemplateDraft>): void => setDraft((prev) => ({ ...prev, ...next }));

    const handleSave = (): void => {
        setSaving(true);
        void onSave({ ...draft, Id: editing?.Id }).finally(() => setSaving(false));
    };

    return (
        <AppModal
            open={open}
            title={editing ? t("settings.printTemplates.wizard.editTitle") : t("settings.printTemplates.wizard.addTitle")}
            onClose={onClose}
        >
            <div className={styles.wizardBody}>
                <PrintTemplateHtmlFields html={draft.Html} onChangeHtml={(Html) => patch({ Html })} />
                <PrintTemplateDetailFields draft={draft} onChange={patch} />
                <div className={styles.wizardActions}>
                    <Button onClick={onClose}>{t("weigh.cancel")}</Button>
                    <Button variant="primary" disabled={!draft.Html.trim() || !draft.Name.trim() || saving} onClick={handleSave}>
                        {t("settings.printTemplates.wizard.save")}
                    </Button>
                </div>
            </div>
        </AppModal>
    );
};
