import { SegmentedControl } from "@components/SegmentedControl";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/ReportsScreen.module.css";
import { viewOptions } from "../reportRows";
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
}: ReportsHeaderActionsProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.headerActions}>
            <SegmentedControl
                options={viewOptions(t)}
                value={view}
                onChange={onViewChange}
                ariaLabel={t("reports.viewAriaLabel")}
            />
            <button className="chip act" onClick={onShowWaiting}>
                <span className={styles.dot} />
                {waitingCount} {t("reports.waitingForSecondWeight")}
            </button>
        </div>
    );
};
