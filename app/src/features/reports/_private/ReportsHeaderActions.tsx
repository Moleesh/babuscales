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
    onOpenBuilder: () => void;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the view switcher + "N waiting" chip + the
// report-builder wizard trigger in the
// Card's headerRight.
// The dev-only "Add sample tickets" control used to live here too — moved to
// Settings → Weighing → ticket numbering (TicketAndDateTimeCard) by request,
// so it sits next to the other ticket-series control instead of Reports.
export const ReportsHeaderActions = ({
    view,
    onViewChange,
    waitingCount,
    onShowWaiting,
    onOpenBuilder,
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
            <button type="button" className="chip act" onClick={onOpenBuilder}>
                {t("reports.builder.trigger")}
            </button>
        </div>
    );
};
