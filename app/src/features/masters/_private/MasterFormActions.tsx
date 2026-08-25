import { useState } from "react";

import { AppModal } from "@components/AppModal";
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
    // The browser's native `window.confirm()` used to gate the hard delete —
    // task: "delete in master is a message we need a better pop" (the raw
    // "localhost:1420 says…" browser chrome read as broken, not themed at
    // all). `AppModal` is the same dialog every other screen-blocking prompt
    // in the app already uses (ReprintLookupModal, PrintPreviewModal), so
    // this stays visually consistent instead of a one-off.
    const [confirmOpen, setConfirmOpen] = useState(false);
    return (
        <div className={styles.formActions}>
            <Button variant="primary" disabled={saving || !canSave} onClick={onSave}>
                {selected ? t("masters.action.saveChanges") : addNewLabel}
            </Button>
            {selected && (
                <Button variant="danger" disabled={saving} onClick={() => setConfirmOpen(true)}>
                    {t("masters.action.delete")}
                </Button>
            )}
            {selected && (
                <Button disabled={saving} onClick={onStartNew}>
                    {t("masters.action.new")}
                </Button>
            )}
            {selected && (
                <AppModal
                    open={confirmOpen}
                    title={t("masters.action.deleteConfirmTitle")}
                    onClose={() => setConfirmOpen(false)}
                    size="small"
                >
                    <div style={{ display: "grid", gap: 13 }}>
                        <p>
                            {t("masters.action.deleteConfirm")} "{selected.Name}"?
                        </p>
                        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
                            <Button onClick={() => setConfirmOpen(false)}>{t("weigh.cancel")}</Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    setConfirmOpen(false);
                                    onDelete();
                                }}
                            >
                                {t("masters.action.delete")}
                            </Button>
                        </div>
                    </div>
                </AppModal>
            )}
        </div>
    );
};
