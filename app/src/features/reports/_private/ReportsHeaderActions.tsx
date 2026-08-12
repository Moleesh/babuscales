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
    /** Dev-only "Add sample tickets" control — undefined outside a dev
     * build (see ReportsScreen's own `import.meta.env.DEV` gate), so the
     * button itself never renders for a real site. */
    onSeedDemoTickets: (() => void) | undefined;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the view switcher + "N waiting" chip + the
// report-builder wizard trigger (task: Reports rework, item 4) in the
// Card's headerRight.
export const ReportsHeaderActions = ({
    view,
    onViewChange,
    waitingCount,
    onShowWaiting,
    onOpenBuilder,
    onSeedDemoTickets,
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
            {onSeedDemoTickets && (
                <button type="button" className="chip act" onClick={onSeedDemoTickets}>
                    {t("reports.seedDemoTickets")}
                </button>
            )}
        </div>
    );
};
