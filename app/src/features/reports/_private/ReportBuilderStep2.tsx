import { Field } from "@components/Field";
import { SegmentedControl } from "@components/SegmentedControl";
import { useTranslation } from "@i18n/useTranslation";

import { filterOptions } from "../reportRows";
import type { TicketRowFilter } from "../reportRows";
import styles from "./_styles/ReportBuilderModal.module.css";

export interface ReportBuilderStep2Props {
    filter: TicketRowFilter;
    onFilterChange: (filter: TicketRowFilter) => void;
}

/** Split out of ReportBuilderModal (over the line/complexity budget —
 * docs/CodingStandards.md) — wizard step 2: which tickets qualify (all /
 * waiting-for-second-weight / both-weights-in). One control on its own
 * step, on purpose — the "guided wizard, not a flat page" ask this whole
 * rework exists for. */
export const ReportBuilderStep2 = ({ filter, onFilterChange }: ReportBuilderStep2Props) => {
    const { t } = useTranslation();
    return (
        <div className={styles.step}>
            <Field id="rbFilter" label={t("reports.filterAriaLabel")}>
                <SegmentedControl
                    options={filterOptions(t)}
                    value={filter}
                    onChange={onFilterChange}
                    ariaLabel={t("reports.filterAriaLabel")}
                />
            </Field>
        </div>
    );
};
