import { useEffect, useRef, useState } from "react";

import type { DataPort } from "@db/DataPort";
import { addReportDef, deleteReportDef, loadReportDefs, renameReportDef, updateReportDef } from "@db/reportDefs";
import type { ReportDefinition } from "@db/reportDefs";

import { GROUP_KEY_VALUES, TICKET_ROW_FILTER_VALUES } from "../reportRows";
import type { GroupKey, ReportView, TicketRowFilter } from "../reportRows";

export interface UseSavedReportActionsArgs {
    db: DataPort;
    view: ReportView;
    groupBy: GroupKey;
    filter: TicketRowFilter;
    /** Report-builder wizard MVP — saved
     * alongside View/GroupBy/Filter so a recalled report also restores its
     * date range and column selection. */
    dateFrom: string;
    dateTo: string;
    visibleColumnKeys: string[] | null;
    setView: (view: ReportView) => void;
    setGroupBy: (groupBy: GroupKey) => void;
    setFilter: (filter: TicketRowFilter) => void;
    setDateFrom: (date: string) => void;
    setDateTo: (date: string) => void;
    setVisibleColumnKeys: (keys: string[] | null) => void;
    /** Reports rework, item 3 — called once on a recall or a save-and-apply,
     * so the controller can flip the screen out of its "no report selected"
     * empty state. Never called for a rename/delete (those don't change
     * what's applied) or for the invalidation effect below (that's the
     * opposite direction). */
    onApplied: () => void;
}

/** The report-builder modal's draft shape — duplicated here (rather than
 * imported from ReportBuilderModal) to keep this hook's own dependency
 * direction (features/reports/_private → nowhere) unchanged; the two are
 * structurally identical by construction. */
export interface ReportBuilderSaveDraft {
    view: ReportView;
    groupBy: GroupKey;
    filter: TicketRowFilter;
    dateFrom: string;
    dateTo: string;
    visibleColumnKeys: string[] | null;
}

export interface UseSavedReportActions {
    savedReports: ReportDefinition[];
    /** Report-builder modal's Save — persists `draft` under `name` *and*
     * applies it as the screen's active view in the same action (item 3:
     * close on save + auto-apply). The only save entry point now — the
     * screen's own inline "Save current view as…" input/button was removed
     * (Reports rework: "remove save view as and save view"). */
    handleSaveReportDraft: (draft: ReportBuilderSaveDraft, name: string) => void;
    /** Task: "edit save report should open the create report in edit form" —
     * the builder modal's Save button when it was opened via a saved view's
     * edit (pencil) action: overwrites that same definition (View/GroupBy/
     * Filter/dates/columns/name) instead of adding a new one, and applies it
     * live the same way a fresh save does. */
    handleUpdateReportDraft: (id: string, draft: ReportBuilderSaveDraft, name: string) => void;
    handleRecallReport: (def: ReportDefinition) => void;
    handleDeleteReport: (id: string) => void;
    /** The saved-views dropdown's own edit (pencil) action — renames in
     * place, doesn't touch what's currently applied to the screen. Unused by
     * SavedReportsRow now that its pencil opens the full builder instead of
     * an inline rename box; kept as a small, still-correct standalone action
     * in case a future caller wants rename-only. */
    handleRenameReport: (id: string, name: string) => void;
    /** `def.Id` of whichever saved view is currently applied, or `null` —
     * `null` on first landing and after any manual filter edit invalidates
     * the recalled view (Reports rework: "no report selected by default").
     * Purely a dropdown-display concern; the underlying filters keep working
     * exactly as before whether or not anything is "selected" here. */
    selectedId: string | null;
}

/** Split out of useSavedReportActions (over the line/complexity budget —
 * docs/CodingStandards.md) — `def.Columns`'s comma-joined string back to a
 * `string[] | null` (an empty list means "no restriction", the same as it
 * never having been saved). */
const buildSaveArgs = (
    args: Pick<UseSavedReportActionsArgs, "view" | "groupBy" | "filter" | "dateFrom" | "dateTo" | "visibleColumnKeys">,
    name: string,
): Omit<ReportDefinition, "Id"> => ({
    Name: name,
    View: args.view,
    GroupBy: args.groupBy,
    Filter: args.filter,
    DateFrom: args.dateFrom || undefined,
    DateTo: args.dateTo || undefined,
    Columns: args.visibleColumnKeys?.join(",") ?? undefined,
});

/** Reports rework, item 5 — used to validate each token against the fixed
 * `TICKET_COLUMN_KEYS` list and drop anything else, which silently dropped
 * every custom-field column (`fieldColumnKey(FieldId)`, reportRows.ts) a
 * saved report had picked — the very bug this item fixes. No validation
 * needed here any more: `buildTicketColumns`' own filter (reportColumns.tsx)
 * already drops any key with no matching column (built-in *or* field, e.g.
 * one whose Field was since deleted from the schema) instead of erroring,
 * so this just has to get the tokens back off the wire. */
const parseSavedColumns = (columns: string | undefined): string[] | null => {
    if (!columns) return null;
    const keys = columns.split(",").filter(Boolean);
    return keys.length > 0 ? keys : null;
};

/** Split out of useSavedReportActions (over the line/complexity budget —
 * docs/CodingStandards.md) — applying a recalled `ReportDefinition` onto the
 * screen's live state, unchanged from the inline version it replaces. */
const applyRecalledReport = (
    def: ReportDefinition,
    args: Pick<
        UseSavedReportActionsArgs,
        "setView" | "setGroupBy" | "setFilter" | "setDateFrom" | "setDateTo" | "setVisibleColumnKeys"
    >,
): void => {
    if (def.View === "tickets" || def.View === "summary") args.setView(def.View);
    if (GROUP_KEY_VALUES.includes(def.GroupBy as GroupKey)) {
        args.setGroupBy(def.GroupBy as GroupKey);
    }
    if (TICKET_ROW_FILTER_VALUES.includes(def.Filter as TicketRowFilter)) {
        args.setFilter(def.Filter as TicketRowFilter);
    }
    args.setDateFrom(def.DateFrom ?? "");
    args.setDateTo(def.DateTo ?? "");
    args.setVisibleColumnKeys(parseSavedColumns(def.Columns));
};

/** Split out of useSavedReportActions (over the line/complexity budget —
 * docs/CodingStandards.md) — the initial saved-report-definitions load
 * effect, unchanged from the inline version it replaces. */
const useLoadedReportDefs = (db: DataPort): [ReportDefinition[], (defs: ReportDefinition[]) => void] => {
    const [savedReports, setSavedReports] = useState<ReportDefinition[]>([]);

    useEffect(() => {
        let cancelled = false;
        void loadReportDefs(db).then((defs) => {
            if (!cancelled) setSavedReports(defs);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    return [savedReports, setSavedReports];
};

interface SaveHandlerDeps
    extends Pick<
        UseSavedReportActionsArgs,
        | "db"
        | "setView"
        | "setGroupBy"
        | "setFilter"
        | "setDateFrom"
        | "setDateTo"
        | "setVisibleColumnKeys"
    > {
    setSavedReports: (defs: ReportDefinition[]) => void;
}

/** Split out of useSavedReportActions (over the line/complexity budget —
 * docs/CodingStandards.md) — the report-builder modal's Save handler.
 * Reports rework: "remove save view as and save view" — the screen's own
 * inline "Save current view as…" input/button (SavedReportsRow.tsx's old
 * `NewViewInput`) is gone, so this used to be a pair (`handleSaveReport` +
 * `handleSaveReportDraft`) and is now just the one save entry point the
 * report-builder wizard already owns. */
const buildSaveHandlers = (
    deps: SaveHandlerDeps,
): Pick<UseSavedReportActions, "handleSaveReportDraft"> => ({
    handleSaveReportDraft: (draft: ReportBuilderSaveDraft, name: string): void => {
        const trimmed = name.trim();
        if (!trimmed) return;
        // Auto-apply first (synchronous) so the report becomes the active
        // view immediately, without waiting on the db round-trip below.
        deps.setView(draft.view);
        deps.setGroupBy(draft.groupBy);
        deps.setFilter(draft.filter);
        deps.setDateFrom(draft.dateFrom);
        deps.setDateTo(draft.dateTo);
        deps.setVisibleColumnKeys(draft.visibleColumnKeys);
        void addReportDef(deps.db, buildSaveArgs(draft, trimmed))
            .then(() => loadReportDefs(deps.db))
            .then(deps.setSavedReports);
    },
});

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the saved-report-definitions
// save/recall/delete handlers, unchanged from the inline version it
// replaces.
export const useSavedReportActions = (args: UseSavedReportActionsArgs): UseSavedReportActions => {
    const { db, view, groupBy, filter, dateFrom, dateTo, visibleColumnKeys, onApplied } = args;
    const { setView, setGroupBy, setFilter, setDateFrom, setDateTo, setVisibleColumnKeys } = args;
    const [savedReports, setSavedReports] = useLoadedReportDefs(db);
    // No saved view is applied on landing — the operator must explicitly
    // pick one from the dropdown (Reports rework: "no report selected by
    // default"). Recall (and the builder's Save-and-apply) sets this;
    // manually editing any filter this hook doesn't own (date range, view,
    // group-by, filter, columns) invalidates it below, so the dropdown
    // trigger never keeps showing a saved view's name once the screen no
    // longer actually matches it.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Set right before a recall/save-draft applies its own batch of
    // setView/setGroupBy/.../setVisibleColumnKeys calls, so the
    // invalidation effect below can tell "these filters just changed
    // because a saved view was applied" apart from "the operator edited a
    // filter by hand" and skip clearing `selectedId` in the former case.
    const justAppliedRef = useRef(false);

    const { handleSaveReportDraft: applyDraft } = buildSaveHandlers({ ...args, setSavedReports });

    const handleSaveReportDraft = (draft: ReportBuilderSaveDraft, name: string): void => {
        justAppliedRef.current = true;
        applyDraft(draft, name);
        onApplied();
    };

    const handleUpdateReportDraft = (id: string, draft: ReportBuilderSaveDraft, name: string): void => {
        const trimmed = name.trim();
        if (!trimmed) return;
        justAppliedRef.current = true;
        setView(draft.view);
        setGroupBy(draft.groupBy);
        setFilter(draft.filter);
        setDateFrom(draft.dateFrom);
        setDateTo(draft.dateTo);
        setVisibleColumnKeys(draft.visibleColumnKeys);
        setSelectedId(id);
        void updateReportDef(db, id, buildSaveArgs(draft, trimmed))
            .then(() => loadReportDefs(db))
            .then(setSavedReports);
        onApplied();
    };

    const handleRecallReport = (def: ReportDefinition): void => {
        justAppliedRef.current = true;
        applyRecalledReport(def, { setView, setGroupBy, setFilter, setDateFrom, setDateTo, setVisibleColumnKeys });
        setSelectedId(def.Id);
        onApplied();
    };

    useEffect(() => {
        if (justAppliedRef.current) {
            justAppliedRef.current = false;
            return;
        }
        setSelectedId(null);
    }, [view, groupBy, filter, dateFrom, dateTo, visibleColumnKeys]);

    const handleDeleteReport = (id: string): void => {
        void deleteReportDef(db, id)
            .then(() => loadReportDefs(db))
            .then((defs) => {
                setSavedReports(defs);
                setSelectedId((current) => (current === id ? null : current));
            });
    };

    const handleRenameReport = (id: string, name: string): void => {
        void renameReportDef(db, id, name)
            .then(() => loadReportDefs(db))
            .then(setSavedReports);
    };

    return {
        savedReports,
        handleSaveReportDraft,
        handleUpdateReportDraft,
        handleRecallReport,
        handleDeleteReport,
        handleRenameReport,
        selectedId,
    };
};
