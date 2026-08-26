import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/PrintTemplatesCard.module.css";

export interface PrintTemplateHtmlFieldsProps {
    html: string;
    onChangeHtml: (html: string) => void;
}

// Upload-or-paste, with no Next/Cancel of its own — task: "let add template
// be a single pop no need it as wizard" collapsed the old two-step wizard
// into one form (PrintTemplateModal), so this is just the HTML half of that
// form's fields. Same click-to-choose `<label>`-wrapped `<input type="file"
// hidden>` shape as Fields' SchemaDropZone, and a plain always-visible
// textarea below it instead of SchemaPasteBox's collapsed-by-default toggle
// — there's no "already have a schema loaded" state to default-collapse
// against here.
export const PrintTemplateHtmlFields = ({ html, onChangeHtml }: PrintTemplateHtmlFieldsProps) => {
    const { t } = useTranslation();

    return (
        <>
            <label className={styles.drop}>
                <span className={styles.dropIcon}>⬆</span>
                <span>{t("settings.printTemplates.wizard.dropPrompt")}</span>
                <input
                    type="file"
                    accept=".html,.htm,text/html"
                    hidden
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void file.text().then(onChangeHtml);
                        event.target.value = "";
                    }}
                />
            </label>
            <p className={styles.orDivider}>{t("settings.printTemplates.wizard.pasteInstead")}</p>
            <textarea
                className={styles.pasteInput}
                value={html}
                placeholder="<html>…</html>"
                onChange={(event) => onChangeHtml(event.target.value)}
            />
        </>
    );
};
