import { useEffect, useRef, useState } from "react";

import type { DataPort } from "@db/DataPort";
import { addReportDef, deleteReportDef, loadReportDefs, renameReportDef } from "@db/reportDefs";
import type { ReportDefinition } from "@db/reportDefs";

import { GROUP_KEY_VALUES, TICKET_COLUMN_KEYS, TICKET_ROW_FILTER_VALUES } from "../reportRows";
import type { GroupKey, ReportView, TicketColumnKey, TicketRowFilter } from "../reportRows";

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
    visibleColumnKeys: TicketColumnKey[] | null;
    setView: (view: ReportView) => void;
    setGroupBy: (groupBy: GroupKey) => void;
    setFilter: (filter: TicketRowFilter) => void;
    setDateFrom: (date: string) => void;
    setDateTo: (date: string) => void;
    setVisibleColumnKeys: (keys: TicketColumnKey[] | null) => void;
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
    visibleColumnKeys: TicketColumnKey[] | null;
}

export interface UseSavedReportActions {
    savedReports: ReportDefinition[];
    newReportName: string;
    setNewReportName: (name: string) => void;
    handleSaveReport: () => void;
    /** Report-builder modal's Save — persists `draft` under `name` *and*
     * applies it as the screen's active view in the same action (item 3:
     * close on save + auto-apply), instead of relying on the screen's own
     * live state the way `handleSaveReport` above does. */
    handleSaveReportDraft: (draft: ReportBuilderSaveDraft, name: string) => void;
    handleRecallReport: (def: ReportDefinition) => void;
    handleDeleteReport: (id: string) => void;
    /** The saved-views dropdown's own edit (pencil) action — renames in
     * place, doesn't touch what's currently applied to the screen. */
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
 * validated `TicketColumnKey[] | null` (an empty/all-invalid list means
 * "no restriction", the same as it never having been saved). */
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

const parseSavedColumns = (columns: string | undefined): TicketColumnKey[] | null => {
    if (!columns) return null;
    const keys = columns
        .split(",")
        .filter((key): key is TicketColumnKey => TICKET_COLUMN_KEYS.includes(key as TicketColumnKey));
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
        | "view"
        | "groupBy"
        | "filter"
        | "dateFrom"
        | "dateTo"
        | "visibleColumnKeys"
        | "setView"
        | "setGroupBy"
        | "setFilter"
        | "setDateFrom"
        | "setDateTo"
        | "setVisibleColumnKeys"
    > {
    newReportName: string;
    setSavedReports: (defs: ReportDefinition[]) => void;
    setNewReportName: (name: string) => void;
}

/** Split out of useSavedReportActions (over the line/complexity budget —
 * docs/CodingStandards.md) — the two Save handlers (screen's own "Save
 * current view as…" input, and the report-builder modal's Save), unchanged
 * from the inline version it replaces. */
const buildSaveHandlers = (
    deps: SaveHandlerDeps,
): Pick<UseSavedReportActions, "handleSaveReport" | "handleSaveReportDraft"> => ({
    handleSaveReport: (): void => {
        const name = deps.newReportName.trim();
        if (!name) return;
        void addReportDef(deps.db, buildSaveArgs(deps, name))
            .then(() => loadReportDefs(deps.db))
            .then((defs) => {
                deps.setSavedReports(defs);
                deps.setNewReportName("");
            });
    },
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
    const { db, view, groupBy, filter, dateFrom, dateTo, visibleColumnKeys } = args;
    const { setView, setGroupBy, setFilter, setDateFrom, setDateTo, setVisibleColumnKeys } = args;
    const [savedReports, setSavedReports] = useLoadedReportDefs(db);
    const [newReportName, setNewReportName] = useState("");
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

    const { handleSaveReport, handleSaveReportDraft: applyDraft } = buildSaveHandlers({
        ...args,
        newReportName,
        setSavedReports,
        setNewReportName,
    });

    const handleSaveReportDraft = (draft: ReportBuilderSaveDraft, name: string): void => {
        justAppliedRef.current = true;
        applyDraft(draft, name);
    };

    const handleRecallReport = (def: ReportDefinition): void => {
        justAppliedRef.current = true;
        applyRecalledReport(def, { setView, setGroupBy, setFilter, setDateFrom, setDateTo, setVisibleColumnKeys });
        setSelectedId(def.Id);
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
        newReportName,
        setNewReportName,
        handleSaveReport,
        handleSaveReportDraft,
        handleRecallReport,
        handleDeleteReport,
        handleRenameReport,
        selectedId,
    };
};
