import { Button } from "@components/Button";
import type { MasterRow } from "@db/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/MastersScreen.module.css";

export interface MasterFormActionsProps {
    selected: MasterRow | null;
    saving: boolean;
    canSave: boolean;
    addNewLabel: string;
    onSave: () => void;
    onToggleActive: () => void;
    /** Hard delete (task: "we need an option to remove the rows in master") — distinct from `onToggleActive`, which only ever hides a row from the picker. Confirmed inline below before firing, since this can't be undone the way Deactivate can. */
    onDelete: () => void;
    onStartNew: () => void;
    onReload: () => void;
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Save/Deactivate/New/Refresh button row,
// unchanged from the inline version it replaces.
export const MasterFormActions = ({
    selected,
    saving,
    canSave,
    addNewLabel,
    onSave,
    onToggleActive,
    onDelete,
    onStartNew,
    onReload,
}: MasterFormActionsProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.formActions}>
            <Button variant="primary" disabled={saving || !canSave} onClick={onSave}>
                {selected ? t("masters.action.saveChanges") : addNewLabel}
            </Button>
            {selected && (
                <Button variant={selected.IsActive ? "danger" : "default"} disabled={saving} onClick={onToggleActive}>
                    {selected.IsActive ? t("masters.action.deactivate") : t("masters.action.activate")}
                </Button>
            )}
            {selected && (
                <Button
                    variant="danger"
                    disabled={saving}
                    onClick={() => {
                        // `confirm()`, not a custom modal — no confirm dialog
                        // exists anywhere else in this app yet to reuse, and
                        // a hard delete is exactly the kind of irreversible
                        // click this app doesn't otherwise have.
                        if (window.confirm(`${t("masters.action.deleteConfirm")} "${selected.Name}"?`)) {
                            onDelete();
                        }
                    }}
                >
                    {t("masters.action.delete")}
                </Button>
            )}
            {selected && (
                <Button disabled={saving} onClick={onStartNew}>
                    {t("masters.action.new")}
                </Button>
            )}
            <Button disabled={saving} onClick={onReload}>
                {t("masters.action.refresh")}
            </Button>
        </div>
    );
};
