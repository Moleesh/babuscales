import type { CameraSlot } from "./cameraFixtures";
import styles from "./CameraTile.module.css";

export interface CameraTileProps {
    slot: CameraSlot;
    vehicleNo: string;
    burnIn: string;
}

// Ported from the mock's `.cam`/`.cam.off` — one tile, shared by both the
// full Cameras tab (CamerasScreen) and Weighing's sidebar card, exactly as
// the mock's own camGrid/camSide render identical innerHTML at two sizes.
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
