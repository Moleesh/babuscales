import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";
import { ReportBuilderColumns } from "./ReportBuilderColumns";
import { ReportBuilderReview } from "./ReportBuilderReview";
import { ReportBuilderSaveRow } from "./ReportBuilderSaveRow";
import type { ReportView, TicketColumnKey, TicketRowFilter } from "../reportRows";

export interface ReportBuilderStep3Props {
    view: ReportView;
    filter: TicketRowFilter;
    dateFrom: string;
    dateTo: string;
    visibleColumnKeys: TicketColumnKey[] | null;
    onVisibleColumnKeysChange: (keys: TicketColumnKey[] | null) => void;
    newReportName: string;
    onNewReportNameChange: (name: string) => void;
    onSaveReport: () => void;
}

/** Split out of ReportBuilderModal (over the line/complexity budget —
 * docs/CodingStandards.md) — wizard step 3, the last one: pick which
 * columns show, review everything picked in steps 1–2, then optionally
 * save the whole combination as a named report (existing
 * useSavedReportActions/db/reportDefs.ts mechanism, unchanged). */
export const ReportBuilderStep3 = ({
    view,
    filter,
    dateFrom,
    dateTo,
    visibleColumnKeys,
    onVisibleColumnKeysChange,
    newReportName,
    onNewReportNameChange,
    onSaveReport,
}: ReportBuilderStep3Props) => {
    const { t } = useTranslation();
    return (
        <div className={styles.step}>
            <ReportBuilderColumns
                visibleColumnKeys={visibleColumnKeys}
                onVisibleColumnKeysChange={onVisibleColumnKeysChange}
            />
            <div>
                <h3 className={styles.reviewTitle}>{t("reports.builder.reviewTitle")}</h3>
                <ReportBuilderReview
                    view={view}
                    filter={filter}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    visibleColumnKeys={visibleColumnKeys}
                />
            </div>
            <ReportBuilderSaveRow
                newReportName={newReportName}
                onNewReportNameChange={onNewReportNameChange}
                onSaveReport={onSaveReport}
            />
        </div>
    );
};
