import { useEffect, useState } from "react";

import type { WeightUnit } from "@constants/numberFormat";
import type { DataPort } from "@db/DataPort";
import type { DocRow } from "@db/types";
import type { FieldBase } from "@engines/schemaEngine";

import { useReportsScreenData } from "./useReportsScreenData";
import { useSavedReportActions } from "./useSavedReportActions";
import type {
    GroupKey,
    ReportView,
    SortDir,
    TicketRowFilter,
    TicketSortKey,
    Translate,
} from "../reportRows";

export interface UseReportsScreenControllerArgs {
    db: DataPort;
    docs: DocRow[];
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    weightUnit: WeightUnit;
    dateFmt: string;
    timeFmt: "24" | "12";
    /** `Numbering.CurrentEpoch` — threaded down to the series filter (reportRows.ts's filterRowsBySeries). */
    currentEpoch: number;
    styles: CSSModuleClasses;
    t: Translate;
    lang: string;
    /** Reports rework, item 5 — the active ticket schema's reportable custom
     * fields (reportColumns.tsx's `reportableSchemaFields`), computed once
     * in ReportsScreen.tsx from `useSchema()` — this hook has no schema
     * context of its own, same reasoning `docs`/`onOpenTicket` are passed in
     * rather than fetched here. */
    schemaFields: FieldBase[];
    /** Dashboard's "waiting" KPI tile navigates here wanting the "waiting on
     * a second weight" filter already applied — without this, the tab
     * switch always landed on the default Tickets/All view regardless of
     * which KPI sent the operator here. Bumped by a counter, not a boolean,
     * so clicking the same tile twice in a row re-applies the filter even
     * if the operator had since changed it by hand. */
    reportsIntent: { kind: "waiting"; nonce: number } | null;
    /** Settings' `Rules.ShowSeriesInReports` — task: "Add a config for
     * showing the series in report, only then user can use it, it hidden
     * behind the flag". Passed straight through to the return value;
     * ReportsCardBody/ReportBuilderModal use it to decide whether the
     * Series dropdown/field renders at all. Doesn't affect `seriesEpoch`'s
     * own default ("current") — the flag only hides the control, not the
     * underlying scoping behaviour. */
    showSeriesEpoch: boolean;
}

// Split out of useReportsScreenController (over the line/complexity budget —
// docs/CodingStandards.md) — the screen's own local filter/view state, with
// no derived data or side effects of its own.
const useReportsScreenFilters = () => {
    const [view, setView] = useState<ReportView>("tickets");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<TicketRowFilter>("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    // Reports' own "include tickets from before the last reset" control —
    // now a dropdown over the numbering series a ticket can belong to
    // (reportRows.ts's `SeriesEpochOption`), not a checkbox. `"current"` is
    // the default so a "Reset the counter now" reads as a genuine fresh
    // start; picking a specific prior series scopes the whole screen to
    // *only* that series, never a merge across series (reportRows.ts's
    // `filterRowsBySeries` doc comment). Plain local state, not persisted,
    // same as every other filter here.
    const [seriesEpoch, setSeriesEpoch] = useState<number | "current" | "all">("current");
    const [groupBy, setGroupBy] = useState<GroupKey>("material");
    const [printOpen, setPrintOpen] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);
    /** Task: "edit save report should open the create report in edit form" —
     * `def.Id` of the saved view being edited via the builder, or `null` when
     * the builder was opened fresh from "Build report" instead. Read by
     * ReportBuilderModal to seed its draft/name from that definition and to
     * update it in place on Save, instead of adding a new one. */
    const [editingReportId, setEditingReportId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<TicketSortKey>("at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[] | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    // Reports rework, item 3 — "report are still having data when i visit
    // that page (there should not be any record without a report being
    // selected)". `false` on landing (and after every remount — see
    // useReportDocs.ts's own cross-remount doc cache, deliberately not
    // mirrored here) means the screen shows its empty state instead of every
    // ticket ever entered. Flips true the moment the operator explicitly
    // asks for data: recalling a saved view, saving+applying the
    // report-builder wizard, or Dashboard's "waiting" KPI tile sending them
    // here with a filter already chosen (useReportsScreenController's
    // showWaiting/useReportsIntentEffect). Never flips back on its own —
    // once the operator has asked for a report, further manual filter edits
    // (search, date range, ...) keep refining that report rather than
    // hiding it again.
    const [reportApplied, setReportApplied] = useState(false);
    return {
        view,
        setView,
        query,
        setQuery,
        filter,
        setFilter,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        seriesEpoch,
        setSeriesEpoch,
        groupBy,
        setGroupBy,
        printOpen,
        setPrintOpen,
        builderOpen,
        setBuilderOpen,
        editingReportId,
        setEditingReportId,
        sortKey,
        setSortKey,
        sortDir,
        setSortDir,
        visibleColumnKeys,
        setVisibleColumnKeys,
        pageIndex,
        setPageIndex,
        reportApplied,
        setReportApplied,
    };
};

// Split out of useReportsScreenController (over the line/complexity budget —
// docs/CodingStandards.md) — resets Tickets pagination back to page 1
// whenever anything that reshuffles or reshortens `visibleRows` changes.
// Without this, narrowing a search from page 3 of 300 rows down to 4 rows
// would leave the table stuck on an empty page 3 instead of jumping back.
interface UseResetPageOnFilterChangeArgs {
    setPageIndex: (pageIndex: number) => void;
    query: string;
    filter: TicketRowFilter;
    dateFrom: string;
    dateTo: string;
    sortKey: TicketSortKey;
    sortDir: SortDir;
}

const useResetPageOnFilterChange = ({
    setPageIndex,
    query,
    filter,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
}: UseResetPageOnFilterChangeArgs): void => {
    useEffect(() => {
        setPageIndex(0);
    }, [setPageIndex, query, filter, dateFrom, dateTo, sortKey, sortDir]);
};

interface ApplyWaitingFilterArgs {
    setView: (view: ReportView) => void;
    setFilter: (filter: TicketRowFilter) => void;
    setDateFrom: (dateFrom: string) => void;
    setDateTo: (dateTo: string) => void;
    setSeriesEpoch: (seriesEpoch: number | "current" | "all") => void;
    setReportApplied: (applied: boolean) => void;
    clearSelection: () => void;
}

// Shared by useReportsIntentEffect (Dashboard's "waiting" KPI tile) and
// showWaiting (Reports' own header waiting chip) below — both are a
// different entry point into the exact same "waiting for a second weight"
// reset, previously two separately-maintained copies of the same six calls
// (task: "i have 19 waiting on second wait when i click it alwyas brings 5
// back" — Dashboard's own copy of this fix had already drifted from the
// chip's once).
//
// Bug: "when click from dashboard on waiting for second waiting the saved
// view [is] not [de]selected" — this applies a filter batch directly, not
// via `handleRecallReport`, so it must clear whichever saved view the
// dropdown was showing itself — see `clearSelection`'s own doc comment
// (useSavedReportActions.ts). "We dont want all series as a defult for all
// these case it should be only on the current series, do it all the
// places" — Dashboard's/the header chip's waitingCount is current-series
// scoped (dashboardData.ts's own doc comment), so this resets to
// `"current"`, not `"all"`, to keep landing here agreeing with that number.
// Clearing the date range still matters — it's an all-date count. Reports
// rework, item 3 — this counts as "the operator explicitly asked for a
// report", same as a saved-view recall, for leaving the empty state.
const applyWaitingFilter = ({
    setView,
    setFilter,
    setDateFrom,
    setDateTo,
    setSeriesEpoch,
    setReportApplied,
    clearSelection,
}: ApplyWaitingFilterArgs): void => {
    setView("tickets");
    setFilter("half");
    setDateFrom("");
    setDateTo("");
    setSeriesEpoch("current");
    setReportApplied(true);
    clearSelection();
};

// Split out of useReportsScreenController (over the line/complexity budget —
// docs/CodingStandards.md) — Dashboard's "waiting" KPI tile intent-to-filter
// wiring, unchanged from the inline version it replaces.
const useReportsIntentEffect = (
    reportsIntent: { kind: "waiting"; nonce: number } | null,
    setView: (view: ReportView) => void,
    setFilter: (filter: TicketRowFilter) => void,
    setDateFrom: (dateFrom: string) => void,
    setDateTo: (dateTo: string) => void,
    setSeriesEpoch: (seriesEpoch: number | "current" | "all") => void,
    setReportApplied: (applied: boolean) => void,
    clearSelection: () => void,
): void => {
    // Deliberately keyed on `reportsIntent` alone (not `setView`/`setFilter`,
    // which are stable setState identities anyway) — this should fire once
    // per nonce bump (a fresh Dashboard click), not on every render.
    useEffect(() => {
        if (reportsIntent?.kind === "waiting") {
            applyWaitingFilter({ setView, setFilter, setDateFrom, setDateTo, setSeriesEpoch, setReportApplied, clearSelection });
        }
    }, [reportsIntent, setView, setFilter, setDateFrom, setDateTo, setSeriesEpoch, setReportApplied, clearSelection]);
};

// Split out of useReportsScreenController (over the line/complexity budget —
// docs/CodingStandards.md) — wires the two existing derived-data/handler
// hooks (useSavedReportActions, useReportsScreenData) off the shared filter
// state, so the controller itself only assembles the pieces.
const useReportsScreenDerivedData = (
    filters: ReturnType<typeof useReportsScreenFilters>,
    args: Omit<UseReportsScreenControllerArgs, "reportsIntent">,
) => {
    const { db, docs, onOpenTicket, amountDp, weightUnit, dateFmt, timeFmt, currentEpoch, styles, t, lang, schemaFields } = args;
    const { view, groupBy, filter, setView, setGroupBy, setFilter, dateFrom, dateTo, setDateFrom, setDateTo, visibleColumnKeys, setVisibleColumnKeys } =
        filters;
    const { seriesEpoch, setSeriesEpoch } = filters;

    const savedReportActions = useSavedReportActions({
        db,
        view,
        groupBy,
        filter,
        dateFrom,
        dateTo,
        visibleColumnKeys,
        seriesEpoch,
        setView,
        setGroupBy,
        setFilter,
        setDateFrom,
        setDateTo,
        setVisibleColumnKeys,
        setSeriesEpoch,
        // Reports rework, item 3 — recalling a saved view or saving+applying
        // the builder's draft both count as "the operator explicitly asked
        // for a report", so both flip the screen out of its empty state.
        onApplied: () => filters.setReportApplied(true),
    });
    const screenData = useReportsScreenData({
        docs,
        ...filters,
        onOpenTicket,
        amountDp,
        weightUnit,
        dateFmt,
        timeFmt,
        currentEpoch,
        styles,
        t,
        lang,
        schemaFields,
    });

    return { savedReportActions, screenData };
};

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — bundles the screen's own local state
// (view/query/filter/date-range/groupBy/printOpen) together with the two
// existing derived-data/handler hooks (useSavedReportActions,
// useReportsScreenData) so ReportsScreen itself only calls one hook.
export const useReportsScreenController = (args: UseReportsScreenControllerArgs) => {
    const { dateFmt, reportsIntent, showSeriesEpoch } = args;
    const filters = useReportsScreenFilters();
    const { setView, setFilter, query, filter, dateFrom, dateTo, sortKey, sortDir, setPageIndex, setReportApplied } = filters;
    const { setBuilderOpen, setEditingReportId, setDateFrom, setDateTo, setSeriesEpoch } = filters;
    const { savedReportActions, screenData } = useReportsScreenDerivedData(filters, args);

    // Task: "edit save report should open the create report in edit form" —
    // SavedReportsRow's pencil action, wired through ReportsCardBody.
    const openReportForEdit = (id: string): void => {
        setEditingReportId(id);
        setBuilderOpen(true);
    };

    // The header's own "waiting for a second weight" chip (waitingCount) —
    // clicking it is an explicit request for a report the same as recalling
    // a saved view (item 3), so it also leaves the empty state.
    // Task: "When i click on it only bring 14 records either the count is
    // wront some other issue" — waitingCount is a global count over every
    // ticket ever entered (useReportsScreenData.ts's own comment on it), but
    // this used to leave whatever date range/series scope was already
    // selected in place, so the resulting table could legitimately show
    // fewer rows than the chip promised. Clearing the date range here makes
    // the chip's own number and what it navigates to agree.
    // Task: "We dont want all series as a defult for all these case it
    // should be only on the current series, do it all the places" —
    // waitingCount (useReportsScreenData.ts) is now current-series scoped
    // like everything else, so this resets to `"current"` rather than
    // `"all"` to keep the chip's own number and what it navigates to in
    // agreement.
    const showWaiting = (): void => {
        applyWaitingFilter({
            setView,
            setFilter,
            setDateFrom,
            setDateTo,
            setSeriesEpoch,
            setReportApplied,
            clearSelection: savedReportActions.clearSelection,
        });
    };

    useReportsIntentEffect(
        reportsIntent,
        setView,
        setFilter,
        setDateFrom,
        setDateTo,
        setSeriesEpoch,
        setReportApplied,
        savedReportActions.clearSelection,
    );
    useResetPageOnFilterChange({ setPageIndex, query, filter, dateFrom, dateTo, sortKey, sortDir });

    // The builder can also be closed via its own X/backdrop/Cancel (not just
    // a successful Save) — either way, `editingReportId` must not linger
    // into the next "Build report" open (that would silently update the
    // last-edited saved view instead of adding a new one).
    const closeBuilder = (): void => {
        setBuilderOpen(false);
        setEditingReportId(null);
    };

    return {
        ...filters,
        savedReportActions,
        showWaiting,
        openReportForEdit,
        closeBuilder,
        dateFmt,
        showSeriesEpoch,
        ...screenData,
    };
};

export type UseReportsScreenController = ReturnType<typeof useReportsScreenController>;
