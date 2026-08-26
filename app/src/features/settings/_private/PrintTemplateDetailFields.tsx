import type { ReactElement } from "react";

import { Field } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/PrintTemplatesCard.module.css";
import type { PrintTemplateDraft } from "./printTemplateTypes";

export interface PrintTemplateDetailFieldsProps {
    draft: PrintTemplateDraft;
    onChange: (patch: Partial<PrintTemplateDraft>) => void;
}

// A numeric field that ignores an empty/unparseable value instead of
// coercing it to 0 mid-edit — same reasoning as TicketAndDateTimeCard's own
// numeric inputs (a blink through 0 while the operator clears the box to
// retype it would otherwise flash the preview to a zero-size page).
interface NumberFieldSpec {
    id: string;
    label: string;
    value: number;
    onChange: (next: number) => void;
    min: number;
}

const numberField = ({ id, label, value, onChange, min }: NumberFieldSpec): ReactElement => (
    <Field id={id} label={label}>
        <input
            id={id}
            type="number"
            min={min}
            value={value}
            onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isNaN(next)) onChange(next);
            }}
        />
    </Field>
);

// Name + paper width/height/margin — the other half of the single-form
// PrintTemplateModal (task: "single pop no need it as wizard"). Task: "no
// need preview in the edit/add template" dropped the inline live preview
// that used to sit below these fields (TemplatePreviewFrame) — Preview is
// now only reachable from the table's own row action
// (PrintTemplatesCard.tsx), which opens PrintTemplatePreviewModal.
export const PrintTemplateDetailFields = ({ draft, onChange }: PrintTemplateDetailFieldsProps) => {
    const { t } = useTranslation();

    return (
        <>
            <div className={styles.detailsGrid}>
                <Field id="tplName" label={t("settings.printTemplates.wizard.name")}>
                    <input
                        id="tplName"
                        value={draft.Name}
                        autoComplete="off"
                        onChange={(event) => onChange({ Name: event.target.value })}
                    />
                </Field>
                {numberField({
                    id: "tplWidth",
                    label: t("settings.printTemplates.wizard.width"),
                    value: draft.WidthMm,
                    onChange: (WidthMm) => onChange({ WidthMm }),
                    min: 1,
                })}
                {numberField({
                    id: "tplHeight",
                    label: t("settings.printTemplates.wizard.height"),
                    value: draft.HeightMm,
                    onChange: (HeightMm) => onChange({ HeightMm }),
                    min: 1,
                })}
                {numberField({
                    id: "tplMargin",
                    label: t("settings.printTemplates.wizard.margin"),
                    value: draft.MarginMm,
                    onChange: (MarginMm) => onChange({ MarginMm }),
                    min: 0,
                })}
            </div>
        </>
    );
};
