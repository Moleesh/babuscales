import { Field, FieldGrid } from "@components/Field";
import { SegmentedControl } from "@components/SegmentedControl";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";
import { ReportBuilderPresets } from "./ReportBuilderPresets";
import { ReportsDateRangeRow } from "./ReportsDateRangeRow";
import { groupOptions, viewOptions } from "../reportRows";
import type { GroupKey, ReportView } from "../reportRows";

export interface ReportBuilderStep1Props {
    view: ReportView;
    onViewChange: (view: ReportView) => void;
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
}

/** Split out of ReportBuilderModal (over the line/complexity budget —
 * docs/CodingStandards.md) — wizard step 1: pick the view (Tickets/Summary,
 * plus Summary's own group-by) and the date range that scopes everything
 * the later steps configure. Presets first (the fast path), manual range
 * underneath for anything a preset doesn't cover. */
export const ReportBuilderStep1 = ({
    view,
    onViewChange,
    groupBy,
    onGroupByChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
}: ReportBuilderStep1Props) => {
    const { t } = useTranslation();
    return (
        <div className={styles.step}>
            <FieldGrid columns={view === "summary" ? 2 : 1}>
                <Field id="rbView" label={t("reports.viewAriaLabel")}>
                    <SegmentedControl
                        options={viewOptions(t)}
                        value={view}
                        onChange={onViewChange}
                        ariaLabel={t("reports.viewAriaLabel")}
                    />
                </Field>
                {view === "summary" ? (
                    <Field id="rbGroup" label={t("reports.groupByLabel")}>
                        <Select id="rbGroup" value={groupBy} options={groupOptions(t)} onChange={onGroupByChange} />
                    </Field>
                ) : null}
            </FieldGrid>
            <ReportBuilderPresets onDateFromChange={onDateFromChange} onDateToChange={onDateToChange} />
            <ReportsDateRangeRow
                dateFrom={dateFrom}
                onDateFromChange={onDateFromChange}
                dateTo={dateTo}
                onDateToChange={onDateToChange}
            />
        </div>
    );
};
