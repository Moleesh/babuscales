import { useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { ConfirmDeleteModal } from "@components/ConfirmDeleteModal";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { useToast } from "@components/Toast";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./_styles/PrintTemplatesCard.module.css";
import { PrintTemplateModal } from "./PrintTemplateModal";
import { PrintTemplatePreviewModal } from "./PrintTemplatePreviewModal";
import type { PrintTemplate, PrintTemplateDraft } from "./printTemplateTypes";
import { usePrintTemplates } from "./usePrintTemplates";

// Task: "let build print template" — same structure as the Fields tab's
// schema editor: upload/paste → a table of saved rows → edit/delete/preview
// next to each one. "we will just have a button which will open a pop to do
// this uinstead if a uploda button" — Add opens PrintTemplateModal rather
// than a bare file input. That modal was originally a two-step wizard;
// task: "let add template be a single pop no need it as wizard" collapsed
// it to one form.
//
// Gating follows the Fields pattern this task was explicitly compared to
// ("Print is going to be like ... fields"): Preview (read-only, like
// Fields' pickers) stays open for anyone; Add/Edit/Delete (the mutating
// actions, like Fields' upload + hide/show) are admin-gated. Pulled
// straight off `useSettings` rather than threaded in as a prop — this card
// is the only thing in PrinterPane that needs it, same reasoning as
// BackupRestoreCard reaching `useSettings`/`useDataPort` itself.
interface BuildColumnsArgs {
    t: (key: string) => string;
    unlocked: boolean;
    selectedId: string;
    onSelect: (row: PrintTemplate) => void;
    onPreview: (row: PrintTemplate) => void;
    onEdit: (row: PrintTemplate) => void;
    onDelete: (row: PrintTemplate) => void;
}

// Pulled out of the component purely to stay under the file's own line
// budget (docs/CodingStandards.md) — same reasoning as FieldSchemaCard's
// own `fieldColumns` helper.
// Task: "we need a select option and preview are always available ... we
// will have a button in action" — Select (which template a weighing ticket
// prints through, `Printers.SelectedPrintTemplateId`) is now a per-row
// action button here instead of a separate dropdown above the table, same
// as Preview: neither is gated by `unlocked` (only Edit/Delete, the actual
// mutating actions, are).
const buildColumns = ({ t, unlocked, selectedId, onSelect, onPreview, onEdit, onDelete }: BuildColumnsArgs): DataTableColumn<PrintTemplate>[] => [
    { key: "name", header: t("settings.printTemplates.table.name"), render: (row) => row.Name },
    {
        key: "size",
        header: t("settings.printTemplates.table.size"),
        render: (row) => `${row.WidthMm} × ${row.HeightMm} mm`,
    },
    {
        key: "actions",
        header: t("settings.printTemplates.table.actions"),
        render: (row) => (
            <div className={styles.rowActions}>
                <button type="button" className={styles.rowAction} disabled={row.Id === selectedId} onClick={() => onSelect(row)}>
                    {row.Id === selectedId ? t("settings.printTemplates.selected") : t("settings.printTemplates.select")}
                </button>
                <button type="button" className={styles.rowAction} onClick={() => onPreview(row)}>
                    {t("settings.printTemplates.preview")}
                </button>
                <button type="button" className={styles.rowAction} disabled={!unlocked} onClick={() => onEdit(row)}>
                    {t("settings.printTemplates.edit")}
                </button>
                <button
                    type="button"
                    className={`${styles.rowAction} ${styles.rowActionDanger}`}
                    disabled={!unlocked}
                    onClick={() => onDelete(row)}
                >
                    {t("settings.printTemplates.delete")}
                </button>
            </div>
        ),
    },
];

interface TemplateModalsProps {
    t: (key: string) => string;
    wizardOpen: boolean;
    editing: PrintTemplate | null;
    previewing: PrintTemplate | null;
    deleting: PrintTemplate | null;
    blockedDeleting: PrintTemplate | null;
    onCloseWizard: () => void;
    onSaveWizard: (draft: PrintTemplateDraft & { Id?: string }) => Promise<void>;
    onClosePreview: () => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
    onCloseBlockedDelete: () => void;
}

// The wizard/preview/delete-confirm/blocked-delete quartet, pulled out of the
// component purely to stay under the file's own line budget — same split as
// `buildColumns`. Blocked-delete (task: "default templates cannot be
// deleted... if the template is selected it cant be deleted as well, when
// deleteing show a pop") is a separate small AppModal rather than reusing
// ConfirmDeleteModal — there's nothing to confirm, just an explanation and
// an OK.
const TemplateModals = ({
    t,
    wizardOpen,
    editing,
    previewing,
    deleting,
    blockedDeleting,
    onCloseWizard,
    onSaveWizard,
    onClosePreview,
    onCancelDelete,
    onConfirmDelete,
    onCloseBlockedDelete,
}: TemplateModalsProps) => (
    <>
        <PrintTemplateModal open={wizardOpen} editing={editing} onClose={onCloseWizard} onSave={onSaveWizard} />
        <PrintTemplatePreviewModal template={previewing} onClose={onClosePreview} />
        <ConfirmDeleteModal
            open={!!deleting}
            title={t("settings.printTemplates.deleteTitle")}
            message={t("settings.printTemplates.deleteMessage")}
            name={deleting?.Name ?? ""}
            confirmLabel={t("settings.printTemplates.delete")}
            onCancel={onCancelDelete}
            onConfirm={onConfirmDelete}
        />
        <AppModal open={!!blockedDeleting} title={t("settings.printTemplates.cantDeleteTitle")} onClose={onCloseBlockedDelete} size="small">
            <p className={styles.hint}>
                {blockedDeleting?.IsDefault
                    ? t("settings.printTemplates.cantDeleteDefault")
                    : t("settings.printTemplates.cantDeleteSelected")}
            </p>
            <div className={styles.wizardActions}>
                <Button variant="primary" onClick={onCloseBlockedDelete}>
                    {t("settings.printTemplates.cantDeleteOk")}
                </Button>
            </div>
        </AppModal>
    </>
);

// Local state + derived handlers for PrintTemplatesCard, split out purely to
// keep the component itself under the file's max-lines-per-function budget.
// `selectedId` (settings.Printers.SelectedPrintTemplateId) decides which row
// is "in use" for weighing-session printing (task: "select option to select
// the template for the weighing session") and, together with `IsDefault`,
// which rows Delete blocks (task: "default templates cannot be deleted...
// if the template is selected it cant be deleted as well").
const usePrintTemplatesCardState = (settings: SettingsBody, save: (next: SettingsBody) => Promise<void>) => {
    const { showToast } = useToast();
    const { t } = useTranslation();
    const { templates, saveTemplate, deleteTemplate } = usePrintTemplates();
    const printers = settings.Printers;
    const selectedId = printers.SelectedPrintTemplateId;
    const setSelectedTemplate = (value: string): void => {
        void save({ ...settings, Printers: { ...printers, SelectedPrintTemplateId: value } });
    };
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editing, setEditing] = useState<PrintTemplate | null>(null);
    const [previewing, setPreviewing] = useState<PrintTemplate | null>(null);
    const [deleting, setDeleting] = useState<PrintTemplate | null>(null);
    const [blockedDeleting, setBlockedDeleting] = useState<PrintTemplate | null>(null);

    const onEdit = (row: PrintTemplate): void => {
        setEditing(row);
        setWizardOpen(true);
    };
    const onSaveWizard = async (draft: PrintTemplateDraft & { Id?: string }): Promise<void> => {
        await saveTemplate(draft);
        showToast(t("components.toast.saved"));
        setWizardOpen(false);
    };
    const onDelete = (row: PrintTemplate): void => {
        if (row.IsDefault || row.Id === selectedId) {
            setBlockedDeleting(row);
            return;
        }
        setDeleting(row);
    };
    const onConfirmDelete = (): void => {
        if (!deleting) return;
        void deleteTemplate(deleting.Id).then(() => setDeleting(null));
    };
    const onAdd = (): void => {
        setEditing(null);
        setWizardOpen(true);
    };
    const onSelect = (row: PrintTemplate): void => setSelectedTemplate(row.Id);

    return {
        templates,
        selectedId,
        onSelect,
        wizardOpen,
        editing,
        previewing,
        deleting,
        blockedDeleting,
        setWizardOpen,
        setPreviewing,
        setDeleting,
        setBlockedDeleting,
        onEdit,
        onDelete,
        onAdd,
        onSaveWizard,
        onConfirmDelete,
    };
};

export const PrintTemplatesCard = () => {
    const { t } = useTranslation();
    const { settings, save, unlocked } = useSettings();
    const {
        templates,
        selectedId,
        onSelect,
        wizardOpen,
        editing,
        previewing,
        deleting,
        blockedDeleting,
        setWizardOpen,
        setPreviewing,
        setBlockedDeleting,
        setDeleting,
        onEdit,
        onDelete,
        onAdd,
        onSaveWizard,
        onConfirmDelete,
    } = usePrintTemplatesCardState(settings, save);

    const columns = buildColumns({ t, unlocked, selectedId, onSelect, onPreview: setPreviewing, onEdit, onDelete });

    return (
        <Card title={<span className="lbl">{t("settings.printTemplates.title")}</span>}>
            <div className={styles.body}>
                <p className={styles.hint}>{t("settings.printTemplates.hint")}</p>
                <DataTable
                    columns={columns}
                    rows={templates}
                    getRowId={(row) => row.Id}
                    emptyMessage={t("settings.printTemplates.empty")}
                />
                <Button disabled={!unlocked} onClick={onAdd}>
                    {t("settings.printTemplates.addButton")}
                </Button>
            </div>

            <TemplateModals
                t={t}
                wizardOpen={wizardOpen}
                editing={editing}
                previewing={previewing}
                deleting={deleting}
                blockedDeleting={blockedDeleting}
                onCloseWizard={() => setWizardOpen(false)}
                onSaveWizard={onSaveWizard}
                onClosePreview={() => setPreviewing(null)}
                onCancelDelete={() => setDeleting(null)}
                onConfirmDelete={onConfirmDelete}
                onCloseBlockedDelete={() => setBlockedDeleting(null)}
            />
        </Card>
    );
};
