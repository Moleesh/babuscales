import { CameraTile } from "@components/CameraTile";

import styles from "./_styles/CameraGrid.module.css";
import { CAMERA_SLOTS } from "./cameraFixtures";

export interface CameraGridProps {
    vehicleNo: string;
    burnIn: string;
    /** "sidebar" is the mock's `camSide` (fixed 2-column, Weighing's action column); "page" is `camGrid` (auto-fit, wider tiles on the full Cameras tab). Same tiles either way. */
    variant: "sidebar" | "page";
}

// Shared by both CamerasScreen (the full tab) and WeighingScreen's sidebar
// card — the mock's own camGrid/camSide render identical tile markup at two
// sizes, so this is that one place.
export const CameraGrid = ({ vehicleNo, burnIn, variant }: CameraGridProps) => (
    <div className={variant === "page" ? styles.page : styles.sidebar}>
        {CAMERA_SLOTS.map((slot) => (
            <CameraTile key={slot.name} slot={slot} vehicleNo={vehicleNo} burnIn={burnIn} />
        ))}
    </div>
);
