import { SegmentedControl } from "@components/SegmentedControl";

import styles from "../_styles/ReportsScreen.module.css";
import { VIEW_OPTIONS } from "../reportRows";
import type { ReportView } from "../reportRows";

export interface ReportsHeaderActionsProps {
    view: ReportView;
    onViewChange: (view: ReportView) => void;
    waitingCount: number;
    onShowWaiting: () => void;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the view switcher + "N waiting" chip in the
// Card's headerRight, unchanged from the inline version it replaces.
export const ReportsHeaderActions = ({
    view,
    onViewChange,
    waitingCount,
    onShowWaiting,
}: ReportsHeaderActionsProps) => (
    <div className={styles.headerActions}>
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={onViewChange} ariaLabel="View" />
        <button className="chip act" onClick={onShowWaiting}>
            <span className={styles.dot} />
            {waitingCount} waiting for a second weight
        </button>
    </div>
);
