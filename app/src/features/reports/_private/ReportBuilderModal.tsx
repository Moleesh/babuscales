import { useEffect, useState } from "react";

import { AppModal } from "@components/AppModal";
import { Field, FieldGrid } from "@components/Field";
import { SegmentedControl } from "@components/SegmentedControl";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";
import { ReportBuilderColumns } from "./ReportBuilderColumns";
import { ReportBuilderPresets } from "./ReportBuilderPresets";
import { ReportBuilderReview } from "./ReportBuilderReview";
import { ReportBuilderSaveRow } from "./ReportBuilderSaveRow";
import { ReportsDateRangeRow } from "./ReportsDateRangeRow";
import { groupOptions, filterOptions, viewOptions } from "../reportRows";
import type { GroupKey, ReportView, SeriesEpochOption, TicketRowFilter } from "../reportRows";

/** The full set of picks the builder saves/applies in one shot — same
 * fields the wizard's three steps used to split across screens, now one
 * draft object so save + auto-apply (item 3) commit atomically instead of
 * racing individual setState calls.
 *
 * Task: "Add series to create report as well so it saved too" —
 * `seriesEpoch` joined the other scope fields for the same reason
 * `dateFrom`/`dateTo` are here: a built report should freeze *which* series
 * it scans, not silently inherit whatever the screen's own Series dropdown
 * happens to be on at recall time. */
export interface ReportBuilderDraft {
    view: ReportView;
    groupBy: GroupKey;
    filter: TicketRowFilter;
    dateFrom: string;
    dateTo: string;
    seriesEpoch: number | "current" | "all";
    visibleColumnKeys: string[] | null;
}

export interface ReportBuilderModalProps {
    open: boolean;
    onClose: () => void;
    /** Starting point for the draft — the screen's currently-applied
     * config, or (task: "edit save report should open the create report in
     * edit form") the saved view being edited, once `editingId` is set.
     * Only a starting point: nothing here changes until Save. */
    initialView: ReportView;
    initialGroupBy: GroupKey;
    initialFilter: TicketRowFilter;
    initialDateFrom: string;
    initialDateTo: string;
    initialSeriesEpoch: number | "current" | "all";
    seriesEpochOptions: SeriesEpochOption[];
    /** Settings' `Rules.ShowSeriesInReports` — task: "Add a config for
     * showing the series in report, only then user can use it, it hidden
     * behind the flag". Off (default): the builder's own Series field is
     * withheld too, same reasoning as ReportsCardBody's copy of this flag. */
    showSeriesEpoch: boolean;
    initialVisibleColumnKeys: string[] | null;
    /** Seeds the name field — the saved view's own name while editing, ""
     * for a fresh build. */
    initialName?: string;
    /** `def.Id` of the saved view being edited, or `null`/undefined for a
     * fresh "Build report". Non-null flips Save to `onUpdateReport` instead
     * of `onSaveReport`, and the modal's own title to "Edit report". */
    editingId?: string | null;
    /** Persists the named report and applies it as the screen's active
     * view. The modal closes itself right after calling this — it does not
     * wait on the (async) save to finish. */
    onSaveReport: (draft: ReportBuilderDraft, name: string) => void;
    /** Overwrites the saved view named by `editingId` in place instead of
     * adding a new one, then applies it the same way `onSaveReport` does. */
    onUpdateReport: (id: string, draft: ReportBuilderDraft, name: string) => void;
}

const draftFromInitial = (initial: ReportBuilderDraft): ReportBuilderDraft => ({ ...initial });

/** Split out of ReportBuilderModal (over the line/complexity budget —
 * docs/CodingStandards.md) — the modal's own local draft state. Isolated
 * from the screen's live filter state on purpose: editing inside the modal
 * must not touch what's shown behind it until the operator saves. Reset
 * from the current screen config on every fresh open, same as the old
 * step-reset effect did for `step`. Keyed on the six primitive `initial`
 * fields (not `open` alone) so eslint's exhaustive-deps rule can verify the
 * effect for real, while still only actually re-seeding when `open` flips
 * true — a mid-session change to the live screen state must not stomp an
 * in-progress edit while the modal is already open.
 */
const useReportBuilderDraft = (
    open: boolean,
    initial: ReportBuilderDraft,
    initialName: string,
): [ReportBuilderDraft, (patch: Partial<ReportBuilderDraft>) => void, string, (name: string) => void] => {
    const [draft, setDraft] = useState<ReportBuilderDraft>(() => draftFromInitial(initial));
    const [name, setName] = useState(initialName);

    useEffect(() => {
        if (open) {
            setDraft(draftFromInitial(initial));
            setName(initialName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately excludes `initial`/`initialName`'s own fields once `open` is already true: re-seeding on every live-state change would overwrite an in-progress edit with whatever the screen behind the modal is doing.
    }, [open]);

    const patchDraft = (patch: Partial<ReportBuilderDraft>): void => setDraft((current) => ({ ...current, ...patch }));
    return [draft, patchDraft, name, setName];
};

// Split out of ReportBuilderModal (over the line/complexity budget —
// docs/CodingStandards.md) — the view/group-by/date-range/filter fields,
// the top half of the single-page form.
const ReportBuilderScopeFields = ({
    draft,
    patchDraft,
    seriesEpochOptions,
    showSeriesEpoch,
}: {
    draft: ReportBuilderDraft;
    patchDraft: (patch: Partial<ReportBuilderDraft>) => void;
    seriesEpochOptions: SeriesEpochOption[];
    showSeriesEpoch: boolean;
}) => {
    const { t } = useTranslation();
    return (
        <>
            <FieldGrid columns={draft.view === "summary" ? 2 : 1}>
                <Field id="rbView" label={t("reports.viewAriaLabel")}>
                    <SegmentedControl
                        options={viewOptions(t)}
                        value={draft.view}
                        onChange={(view: ReportView) => patchDraft({ view })}
                        ariaLabel={t("reports.viewAriaLabel")}
                    />
                </Field>
                {draft.view === "summary" ? (
                    <Field id="rbGroup" label={t("reports.groupByLabel")}>
                        <Select
                            id="rbGroup"
                            value={draft.groupBy}
                            options={groupOptions(t)}
                            onChange={(groupBy: GroupKey) => patchDraft({ groupBy })}
                        />
                    </Field>
                ) : null}
            </FieldGrid>
            <ReportBuilderPresets
                onDateFromChange={(dateFrom) => patchDraft({ dateFrom })}
                onDateToChange={(dateTo) => patchDraft({ dateTo })}
            />
            <ReportsDateRangeRow
                dateFrom={draft.dateFrom}
                onDateFromChange={(dateFrom) => patchDraft({ dateFrom })}
                dateTo={draft.dateTo}
                onDateToChange={(dateTo) => patchDraft({ dateTo })}
                seriesEpoch={showSeriesEpoch ? draft.seriesEpoch : undefined}
                onSeriesEpochChange={showSeriesEpoch ? (seriesEpoch) => patchDraft({ seriesEpoch }) : undefined}
                seriesEpochOptions={showSeriesEpoch ? seriesEpochOptions : undefined}
            />
            <Field id="rbFilter" label={t("reports.filterAriaLabel")}>
                <SegmentedControl
                    options={filterOptions(t)}
                    value={draft.filter}
                    onChange={(filter: TicketRowFilter) => patchDraft({ filter })}
                    ariaLabel={t("reports.filterAriaLabel")}
                />
            </Field>
        </>
    );
};

// Task: Reports rework, item 4 — the report-builder wizard. Originally a
// 3-step wizard; collapsed to a single page (Reports rework follow-up) once
// "guided wizard" turned out to mean more clicking than guidance for a form
// this short. Every field edits a local draft, not the screen's own live
// state (useReportBuilderDraft, above) — closing without saving now
// discards the edit instead of leaving it applied behind the modal. Saving
// persists the named report and applies its config as the screen's active
// view in the same action (see onSaveReport), then closes the modal.
export const ReportBuilderModal = (props: ReportBuilderModalProps) => {
    const { open, onClose, onSaveReport, onUpdateReport, editingId, seriesEpochOptions, showSeriesEpoch } = props;
    const { t } = useTranslation();
    const initial: ReportBuilderDraft = {
        view: props.initialView,
        groupBy: props.initialGroupBy,
        filter: props.initialFilter,
        dateFrom: props.initialDateFrom,
        dateTo: props.initialDateTo,
        seriesEpoch: props.initialSeriesEpoch,
        visibleColumnKeys: props.initialVisibleColumnKeys,
    };
    const [draft, patchDraft, name, setName] = useReportBuilderDraft(open, initial, props.initialName ?? "");

    const handleSave = (): void => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (editingId) onUpdateReport(editingId, draft, trimmed);
        else onSaveReport(draft, trimmed);
        onClose();
    };

    return (
        <AppModal
            open={open}
            title={editingId ? t("reports.builder.editTitle") : t("reports.builder.title")}
            onClose={onClose}
        >
            <div className={styles.body}>
                <ReportBuilderScopeFields
                    draft={draft}
                    patchDraft={patchDraft}
                    seriesEpochOptions={seriesEpochOptions}
                    showSeriesEpoch={showSeriesEpoch}
                />
                <ReportBuilderColumns
                    visibleColumnKeys={draft.visibleColumnKeys}
                    onVisibleColumnKeysChange={(visibleColumnKeys) => patchDraft({ visibleColumnKeys })}
                />
                <div>
                    <h3 className={styles.reviewTitle}>{t("reports.builder.reviewTitle")}</h3>
                    <ReportBuilderReview
                        view={draft.view}
                        filter={draft.filter}
                        dateFrom={draft.dateFrom}
                        dateTo={draft.dateTo}
                        visibleColumnKeys={draft.visibleColumnKeys}
                    />
                </div>
                <ReportBuilderSaveRow newReportName={name} onNewReportNameChange={setName} onSaveReport={handleSave} />
            </div>
        </AppModal>
    );
};
