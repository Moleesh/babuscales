import { useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import type { ReportDefinition } from "@db/reportDefs";
import { useCloseOnOutsideClick } from "@hooks/useCloseOnOutsideClick";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/SavedReportsRow.module.css";
import { builtinReportDefs, isBuiltinReportId } from "./builtinReportDefs";
import dateRangeStyles from "../_styles/ReportsScreen.module.css";

export interface SavedReportsRowProps {
    savedReports: ReportDefinition[];
    /** `def.Id` of whichever saved view is currently applied, or `null` —
     * `null` on landing (Reports rework: "no report selected by default"). */
    selectedId: string | null;
    /** Bug: "if we change any quick filter it goes back to select saved
     * instead of saying dynamic" — true once a report *was* applied (a
     * recall, Dashboard's waiting tile, a builder save) but `selectedId` has
     * since gone back to `null` because a filter was edited by hand
     * (useSavedReportActions.ts's invalidation effect) or a direct-apply
     * path cleared it (its `clearSelection`). Swaps the trigger's
     * placeholder from "no view chosen yet" to "diverged from a view". */
    dynamic: boolean;
    onRecall: (def: ReportDefinition) => void;
    onDelete: (id: string) => void;
    /** Task: "edit save report should open the create report in edit form" —
     * the pencil action opens the builder pre-filled with this def instead
     * of the old inline rename box. */
    onEdit: (id: string) => void;
}


interface SavedViewRowProps {
    def: ReportDefinition;
    active: boolean;
    onPick: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

// One row of the open popover: the plain recall button + pencil/trash
// actions — split out purely to keep SavedReportsRow itself under the
// file's own line budget.
const SavedViewRow = ({ def, active, onPick, onEdit, onDelete }: SavedViewRowProps) => {
    const { t } = useTranslation();
    // Task: "...think of more and implement them they cant be edited or
    // deleted" — builtinReportDefs.ts's presets (Daily/Weekly/.../Waiting)
    // never reach `addReportDef`, so there's nothing in the db an edit or
    // delete could act on; just don't offer the actions for them.
    const builtin = isBuiltinReportId(def.Id);
    return (
        <div className={`${styles.optionRow} ${active ? styles.optionRowActive : ""}`}>
            <button type="button" className={styles.option} data-cursor="compact" onClick={onPick}>
                {def.Name}
            </button>
            {!builtin && (
                <>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        data-cursor="compact"
                        aria-label={`${t("reports.savedReportsEditPrefix")} ${def.Name}`}
                        onClick={onEdit}
                    >
                        ✎
                    </button>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        data-cursor="compact"
                        aria-label={`${t("reports.savedReportsDeletePrefix")} ${def.Name}`}
                        onClick={onDelete}
                    >
                        ×
                    </button>
                </>
            )}
        </div>
    );
};

// Task #54's saved-report-definitions control, redone as a single dropdown
// (Reports rework, item 1) — a row of chips crowded the same line as the
// "Save current view as…" input once there were more than a couple of saved
// views. "A little customized" over components/Select: each row carries an
// edit (rename) and delete action alongside the plain recall click, which a
// bare `<select>`/`Select` can't do. Placed on the same sticky filter line
// as the date pickers (ReportsCardBody.tsx) instead of its own row.
interface SavedViewsListProps {
    savedReports: ReportDefinition[];
    selectedId: string | null;
    onPick: (def: ReportDefinition) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

// The open popover's row list — split out of SavedReportsRow purely to keep
// it under the file's own line budget (docs/CodingStandards.md).
const SavedViewsList = ({ savedReports, selectedId, onPick, onEdit, onDelete }: SavedViewsListProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.list} role="listbox">
            {savedReports.length === 0 && <div className={styles.empty}>{t("reports.savedReportsNone")}</div>}
            {savedReports.map((def) => (
                <SavedViewRow
                    key={def.Id}
                    def={def}
                    active={def.Id === selectedId}
                    onPick={() => onPick(def)}
                    onEdit={() => onEdit(def.Id)}
                    onDelete={() => onDelete(def.Id)}
                />
            ))}
        </div>
    );
};

// The inline "Save current view as…" input + "Save view" button used to
// live here (`NewViewInput`) — removed per user feedback: "remove save view
// as and save view". Saving a named view now only happens through the
// report-builder wizard's own save row (ReportBuilderSaveRow.tsx, wired via
// ReportBuilderModal's `onSaveReport` -> useSavedReportActions'
// `handleSaveReportDraft`), which already saves *and* applies a report in
// one action — this row now only recalls/renames/deletes what's already
// saved.

export const SavedReportsRow = ({ savedReports, selectedId, dynamic, onRecall, onDelete, onEdit }: SavedReportsRowProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useCloseOnOutsideClick(open, () => setOpen(false));
    // Task: "delete needs confirmation, i think we missed this in the
    // report add it there too" — the × button used to call `onDelete`
    // straight through to `deleteReportDef`; same confirm-modal shape as
    // Settings → Language's delete-package flow (LanguageTableCard.tsx).
    const [pendingDelete, setPendingDelete] = useState<ReportDefinition | null>(null);
    // Task: "we might need to create some default filters / 1 daily, weekly,
    // monthly, waiting for second wait, ... think of more and implement
    // them they cant be edited or deleted" — the built-ins always lead the
    // list, ahead of whatever the operator has saved themselves. Recomputed
    // fresh on every render (not memoized) so "Daily"/"Weekly"/"Monthly"
    // always resolve to *today*'s date, not whatever day this component
    // first mounted.
    const allReports = [...builtinReportDefs(t), ...savedReports];
    const selected = allReports.find((def) => def.Id === selectedId);

    return (
        // Task: "the below one need a better placement first one doesnt
        // have a label" — this dropdown used to be the one unlabeled
        // control on the row; wrapped the same way ReportsDateRangeRow
        // captions its own From date/To date/Series triggers (same
        // `rangeField`/`rangeFieldLabel` classes, reused rather than
        // duplicated) so the whole filter line reads consistently.
        <div className={dateRangeStyles.rangeField}>
            <span className={dateRangeStyles.rangeFieldLabel}>{t("reports.savedReportsLabel")}</span>
            <div className={styles.wrap} ref={ref}>
                <button
                    type="button"
                    className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                >
                    <span className={styles.label}>
                        {selected?.Name ?? (dynamic ? t("reports.savedReportsDynamic") : t("reports.savedReportsPlaceholder2"))}
                    </span>
                    <span className={styles.chevron} aria-hidden="true">▾</span>
                </button>
                {open && (
                    <SavedViewsList
                        savedReports={allReports}
                        selectedId={selectedId}
                        onPick={(def) => {
                            onRecall(def);
                            setOpen(false);
                        }}
                        onEdit={(id) => {
                            onEdit(id);
                            setOpen(false);
                        }}
                        onDelete={(id) => {
                            const target = allReports.find((def) => def.Id === id);
                            if (target) setPendingDelete(target);
                            setOpen(false);
                        }}
                    />
                )}
            </div>
            {pendingDelete && (
                <AppModal
                    open
                    title={t("reports.savedReportsDeleteConfirmTitle")}
                    onClose={() => setPendingDelete(null)}
                    size="small"
                >
                    <div style={{ display: "grid", gap: 13 }}>
                        <p>
                            {t("reports.savedReportsDeleteConfirm")} "{pendingDelete.Name}"?
                        </p>
                        <div style={{ display: "flex", gap: 9, justifyContent: "flex-end" }}>
                            <Button onClick={() => setPendingDelete(null)}>{t("weigh.cancel")}</Button>
                            <Button
                                variant="danger"
                                onClick={() => {
                                    onDelete(pendingDelete.Id);
                                    setPendingDelete(null);
                                }}
                            >
                                {t("reports.savedReportsDeletePrefix")}
                            </Button>
                        </div>
                    </div>
                </AppModal>
            )}
        </div>
    );
};
