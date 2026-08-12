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
