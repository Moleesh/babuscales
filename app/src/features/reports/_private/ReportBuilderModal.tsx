import { useEffect, useState } from "react";

import { AppModal } from "@components/AppModal";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";
import { ReportBuilderNav } from "./ReportBuilderNav";
import { ReportBuilderStep1 } from "./ReportBuilderStep1";
import { ReportBuilderStep2 } from "./ReportBuilderStep2";
import { ReportBuilderStep3 } from "./ReportBuilderStep3";
import type { ReportBuilderStep } from "./reportBuilderSteps";
import { reportBuilderStepTitle } from "./reportBuilderSteps";
import type { GroupKey, ReportView, TicketColumnKey, TicketRowFilter } from "../reportRows";

export interface ReportBuilderModalProps {
    open: boolean;
    onClose: () => void;
    view: ReportView;
    onViewChange: (view: ReportView) => void;
    groupBy: GroupKey;
    onGroupByChange: (groupBy: GroupKey) => void;
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

const FIRST_STEP: ReportBuilderStep = 1;
const LAST_STEP: ReportBuilderStep = 3;

/** Split out of ReportBuilderModal (over the line/complexity budget —
 * docs/CodingStandards.md) — steps back/forward one at a time, clamped to
 * the valid range; separated from the JSX so the step-advance rule lives
 * in one place instead of two inline closures. */
const useReportBuilderStep = (open: boolean): [ReportBuilderStep, () => void, () => void] => {
    const [step, setStep] = useState<ReportBuilderStep>(FIRST_STEP);

    // Every fresh open starts back at step 1 — a half-finished wizard from
    // a previous visit would otherwise strand the operator on step 3 with
    // step 1/2 fields they never actually looked at this time.
    useEffect(() => {
        if (open) setStep(FIRST_STEP);
    }, [open]);

    const goBack = (): void => setStep((current) => (current > FIRST_STEP ? ((current - 1) as ReportBuilderStep) : current));
    const goNext = (): void => setStep((current) => (current < LAST_STEP ? ((current + 1) as ReportBuilderStep) : current));
    return [step, goBack, goNext];
};

// Task: Reports rework, item 4 — the report-builder wizard. A stepped
// popup (not an inline dump in the card body) that walks the operator
// through date range & view, then filter, then columns/save/review — one
// concern per screen instead of every control at once. Every field applies
// live to the screen's own state as it changes (same shape as the
// always-visible date-range row), so closing early keeps whatever was
// picked so far; there is nothing to "apply" on Finish beyond closing.
export const ReportBuilderModal = ({
    open,
    onClose,
    view,
    onViewChange,
    groupBy,
    onGroupByChange,
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
    const [step, goBack, goNext] = useReportBuilderStep(open);

    return (
        <AppModal open={open} title={t("reports.builder.title")} onClose={onClose}>
            <div className={styles.body}>
                <h3 className={styles.stepTitle}>{reportBuilderStepTitle(step, t)}</h3>
                {step === 1 ? (
                    <ReportBuilderStep1
                        view={view}
                        onViewChange={onViewChange}
                        groupBy={groupBy}
                        onGroupByChange={onGroupByChange}
                        dateFrom={dateFrom}
                        onDateFromChange={onDateFromChange}
                        dateTo={dateTo}
                        onDateToChange={onDateToChange}
                    />
                ) : null}
                {step === 2 ? <ReportBuilderStep2 filter={filter} onFilterChange={onFilterChange} /> : null}
                {step === 3 ? (
                    <ReportBuilderStep3
                        view={view}
                        filter={filter}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        visibleColumnKeys={visibleColumnKeys}
                        onVisibleColumnKeysChange={onVisibleColumnKeysChange}
                        newReportName={newReportName}
                        onNewReportNameChange={onNewReportNameChange}
                        onSaveReport={onSaveReport}
                    />
                ) : null}
                <ReportBuilderNav step={step} onBack={goBack} onNext={goNext} onFinish={onClose} />
            </div>
        </AppModal>
    );
};
