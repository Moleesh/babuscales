import { Button } from "@components/Button";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";
import { REPORT_BUILDER_STEPS, reportBuilderStepLabel } from "./reportBuilderSteps";
import type { ReportBuilderStep } from "./reportBuilderSteps";

export interface ReportBuilderNavProps {
    step: ReportBuilderStep;
    onBack: () => void;
    onNext: () => void;
    onFinish: () => void;
}

/** Split out of ReportBuilderModal (over the line/complexity budget —
 * docs/CodingStandards.md) — the wizard's step dots, Back button, and the
 * Next/Finish button (Finish only on the last step, since that's where the
 * save row already lives). */
export const ReportBuilderNav = ({ step, onBack, onNext, onFinish }: ReportBuilderNavProps) => {
    const { t } = useTranslation();
    const isFirst = step === 1;
    const isLast = step === 3;

    return (
        <div className={styles.nav}>
            <ol className={styles.steps} aria-label={t("reports.builder.stepsAriaLabel")}>
                {REPORT_BUILDER_STEPS.map((dot) => (
                    <li
                        key={dot}
                        className={dot === step ? styles.stepDotActive : styles.stepDot}
                        aria-current={dot === step ? "step" : undefined}
                    >
                        {reportBuilderStepLabel(dot, t)}
                    </li>
                ))}
            </ol>
            <div className={styles.navButtons}>
                <Button onClick={onBack} disabled={isFirst}>
                    {t("reports.builder.back")}
                </Button>
                {isLast ? (
                    <Button variant="primary" onClick={onFinish}>
                        {t("reports.builder.done")}
                    </Button>
                ) : (
                    <Button variant="primary" onClick={onNext}>
                        {t("reports.builder.next")}
                    </Button>
                )}
            </div>
        </div>
    );
};
