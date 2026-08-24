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
    /** Hard delete (task: "we need an option to remove the rows in master"). Confirmed inline below before firing — this can't be undone. */
    onDelete: () => void;
    onStartNew: () => void;
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Save/New button row. Deactivate/Activate
// (and its Status column in masterColumns.tsx) and Refresh were removed
// per request: "we dont want deactivate in masters remove the whole logic
// and the column" / "we dont need refresh in master" — Save's own
// `reloadToken` (useMasterCache) already keeps the visible list current, so
// a manual refresh button had nothing left to do.
export const MasterFormActions = ({
    selected,
    saving,
    canSave,
    addNewLabel,
    onSave,
    onDelete,
    onStartNew,
}: MasterFormActionsProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.formActions}>
            <Button variant="primary" disabled={saving || !canSave} onClick={onSave}>
                {selected ? t("masters.action.saveChanges") : addNewLabel}
            </Button>
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
        </div>
    );
};
