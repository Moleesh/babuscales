import styles from "../WeighingScreen.module.css";
import { WeighingLeftColumn } from "./WeighingLeftColumn";
import type { WeighingLeftColumnProps } from "./WeighingLeftColumn";
import { WeighingRightColumn } from "./WeighingRightColumn";
import type { WeighingRightColumnProps } from "./WeighingRightColumn";

export interface WeighingBodyProps {
    left: WeighingLeftColumnProps;
    right: WeighingRightColumnProps;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the mock's own two-column `.layout` grid, unchanged; just the column
// props threaded through as two bundles instead of individually.
export const WeighingBody = ({ left, right }: WeighingBodyProps) => (
    <div className={styles.layout}>
        <div className={styles.col}>
            <WeighingLeftColumn {...left} />
        </div>
        <div className={styles.col}>
            <WeighingRightColumn {...right} />
        </div>
    </div>
);
