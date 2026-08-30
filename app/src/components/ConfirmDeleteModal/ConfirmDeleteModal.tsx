import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ConfirmDeleteModal.module.css";

export interface ConfirmDeleteModalProps {
    open: boolean;
    title: string;
    /** Rendered as `{message} "{name}"?` — every current caller's own copy
     * put the quoted name straight after a short lead-in sentence, so this
     * keeps that shape instead of asking each caller to interpolate it
     * itself. */
    message: string;
    name: string;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: () => void;
}

// A hard-delete confirmation — task: "delete in master is a message we need
// a better pop" (the browser's native `window.confirm()` read as broken, not
// themed at all). Previously two separate copies of the exact same
// AppModal/Button-row shape (masters' MasterFormActions.tsx and settings'
// LanguageTableCard.tsx), each gating its own hard delete the same way; one
// shared component instead.
export const ConfirmDeleteModal = ({ open, title, message, name, confirmLabel, onCancel, onConfirm }: ConfirmDeleteModalProps) => {
    const { t } = useTranslation();
    return (
        <AppModal open={open} title={title} onClose={onCancel} size="small">
            <div className={styles.body}>
                <p>
                    {/* A function replacer, not a string one — `name` is
                        arbitrary user-entered record text, and String.replace
                        interprets `$`-patterns (`$&`, `$$`, ...) in a string
                        replacement argument even against a plain-string
                        search pattern. A function replacer's return value is
                        inserted literally. */}
                    {message} {t("confirmDeleteModal.nameSuffix").replace("{name}", () => name)}
                </p>
                <div className={styles.actions}>
                    <Button onClick={onCancel}>{t("weigh.cancel")}</Button>
                    <Button variant="danger" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </AppModal>
    );
};
