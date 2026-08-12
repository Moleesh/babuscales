import { useState } from "react";

import { useTranslation } from "@i18n/useTranslation";

import { AdminUnlockModal } from "./_private/AdminUnlockModal";
import { useSettings } from "./useSettings";

// The top-bar `#admChip` (demo/BabuScales-demo.html) — reachable from every
// tab, not just Settings. Unlocked → clicking locks immediately (no
// confirmation, same as the mock's `askAdmin`); locked → opens the unlock
// modal.
export const AdminChip = () => {
    const { unlocked, lock } = useSettings();
    const { t } = useTranslation();
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <button
                className={`chip act${unlocked ? " on" : ""}`}
                title={t("settings.adminChip.title")}
                onClick={() => (unlocked ? lock() : setModalOpen(true))}
            >
                {unlocked ? `🔓 ${t("settings.adminChip.admin")}` : `🔒 ${t("settings.adminChip.locked")}`}
            </button>
            <AdminUnlockModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    );
};
