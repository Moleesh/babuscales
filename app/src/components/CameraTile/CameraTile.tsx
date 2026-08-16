import styles from "./_styles/CameraTile.module.css";
import type { CameraTileProps } from "./CameraTile.types";

export type { CameraTileProps, CameraTileSlot } from "./CameraTile.types";

// Ported from the mock's `.cam`/`.cam.off` — one tile, shared by both the
// full Cameras tab (CamerasScreen) and Weighing's sidebar card, exactly as
// the mock's own camGrid/camSide render identical innerHTML at two sizes.
// Moved here from `features/cameras/` (docs/CodingStandards.md §3 review)
// — it's rendered from two different feature
// screens, which is exactly the "on screen twice" rule for belonging in
// `components/` rather than a single feature folder.
export const CameraTile = ({ slot, vehicleNo, burnIn }: CameraTileProps) => {
    if (!slot.configured) {
        return (
            <div className={`${styles.cam} ${styles.off}`}>
                <span>{slot.name} · not configured</span>
            </div>
        );
    }
    return (
        <div className={styles.cam}>
            <span className={styles.name}>{slot.name}</span>
            {slot.showsPlate && <span className={styles.plate}>{vehicleNo || "—"}</span>}
            <span className={styles.burn}>{burnIn}</span>
        </div>
    );
};
