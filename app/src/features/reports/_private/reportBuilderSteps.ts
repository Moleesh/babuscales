import type { Translate } from "../reportRows";

/** The report-builder wizard's three steps (task: Reports rework — "guided
 * wizard, not a flat page"). Order matters: date range/view first (scopes
 * everything after it), filter second, columns/save/review last so the
 * operator sees a summary of every earlier pick right before finishing. */
export const REPORT_BUILDER_STEPS = [1, 2, 3] as const;

export type ReportBuilderStep = (typeof REPORT_BUILDER_STEPS)[number];

export const reportBuilderStepTitle = (step: ReportBuilderStep, t: Translate): string =>
    t(`reports.builder.step${step}Title`);

export const reportBuilderStepLabel = (step: ReportBuilderStep, t: Translate): string =>
    t(`reports.builder.step${step}Label`);
