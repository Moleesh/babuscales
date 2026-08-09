import { useState } from "react";

import { AdminUnlockModal } from "./_private/AdminUnlockModal";
import { useSettings } from "./useSettings";

// The top-bar `#admChip` (demo/BabuScale-demo.html) — reachable from every
// tab, not just Settings. Unlocked → clicking locks immediately (no
// confirmation, same as the mock's `askAdmin`); locked → opens the unlock
// modal.
export const AdminChip = () => {
    const { unlocked, lock } = useSettings();
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <button
                className={`chip act${unlocked ? " on" : ""}`}
                title="Admin lock"
                onClick={() => (unlocked ? lock() : setModalOpen(true))}
            >
                {unlocked ? "🔓 Admin" : "🔒 Locked"}
            </button>
            <AdminUnlockModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    );
};
