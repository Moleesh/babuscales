import { AppModal } from "@components/AppModal";
import { SegmentedControl } from "@components/SegmentedControl";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";
import { ReportBuilderColumns } from "./ReportBuilderColumns";
import { ReportBuilderPresets } from "./ReportBuilderPresets";
import { ReportBuilderSaveRow } from "./ReportBuilderSaveRow";
import { ReportsDateRangeRow } from "./ReportsDateRangeRow";
import { filterOptions } from "../reportRows";
import type { TicketColumnKey, TicketRowFilter } from "../reportRows";

export interface ReportBuilderModalProps {
    open: boolean;
    onClose: () => void;
    filter: TicketRowFilter;
    onFilterChange: (filter: TicketRowFilter) => void;
    dateFrom: string;
    onDateFromChange: (date: string) => void;
    dateTo: string;
    onDateToChange: (date: string) => void;
    visibleColumnKeys: TicketColumnKey[] | null;
    onVisibleColumnKeysChange: (keys: TicketColumnKey[] | null) => void;
    newReportName: string;
    onNewReportNameChange: (name: string) => void;
    onSaveReport: () => void;
}

// Task: Reports rework, item 4 — the report-builder wizard MVP. A popup
// (not an inline dump in the card body) that lets the operator pick a date
// range (quick presets or the same manual ReportsDateRangeRow the screen
// already has), a ticket filter, and which columns show — then save the
// whole combination through the existing saved-report mechanism
// (useSavedReportActions/db/reportDefs.ts), not a new persistence layer.
// Every field here applies live to the screen's own state as it changes
// (same shape as the always-visible date-range row), so "Done" only ever
// closes the popup — there is nothing left to "apply".
export const ReportBuilderModal = ({
    open,
    onClose,
    filter,
    onFilterChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    visibleColumnKeys,
    onVisibleColumnKeysChange,
    newReportName,
    onNewReportNameChange,
    onSaveReport,
}: ReportBuilderModalProps) => {
    const { t } = useTranslation();

    return (
        <AppModal open={open} title={t("reports.builder.title")} onClose={onClose}>
            <div className={styles.body}>
                <ReportBuilderPresets
                    onDateFromChange={onDateFromChange}
                    onDateToChange={onDateToChange}
                />
                <ReportsDateRangeRow
                    dateFrom={dateFrom}
                    onDateFromChange={onDateFromChange}
                    dateTo={dateTo}
                    onDateToChange={onDateToChange}
                />
                <SegmentedControl
                    options={filterOptions(t)}
                    value={filter}
                    onChange={onFilterChange}
                    ariaLabel={t("reports.filterAriaLabel")}
                />
                <ReportBuilderColumns
                    visibleColumnKeys={visibleColumnKeys}
                    onVisibleColumnKeysChange={onVisibleColumnKeysChange}
                />
                <ReportBuilderSaveRow
                    newReportName={newReportName}
                    onNewReportNameChange={onNewReportNameChange}
                    onSaveReport={onSaveReport}
                    onDone={onClose}
                />
            </div>
        </AppModal>
    );
};
