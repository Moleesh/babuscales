import { useEffect, useState } from "react";

import type { WeightUnit } from "@constants/numberFormat";
import type { DataPort } from "@db/DataPort";
import type { DocRow } from "@db/types";

import { useReportsScreenData } from "./useReportsScreenData";
import { useSavedReportActions } from "./useSavedReportActions";
import type {
    GroupKey,
    ReportView,
    SortDir,
    TicketColumnKey,
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
    /** Dashboard's "waiting" KPI tile navigates here wanting the "waiting on
     * a second weight" filter already applied — without this, the tab
     * switch always landed on the default Tickets/All view regardless of
     * which KPI sent the operator here. Bumped by a counter, not a boolean,
     * so clicking the same tile twice in a row re-applies the filter even
     * if the operator had since changed it by hand. */
    reportsIntent: { kind: "waiting"; nonce: number } | null;
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
    const [seriesEpoch, setSeriesEpoch] = useState<number | "current">("current");
    const [groupBy, setGroupBy] = useState<GroupKey>("material");
    const [printOpen, setPrintOpen] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);
    const [sortKey, setSortKey] = useState<TicketSortKey>("at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<TicketColumnKey[] | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
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
        sortKey,
        setSortKey,
        sortDir,
        setSortDir,
        visibleColumnKeys,
        setVisibleColumnKeys,
        pageIndex,
        setPageIndex,
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

// Split out of useReportsScreenController (over the line/complexity budget —
// docs/CodingStandards.md) — Dashboard's "waiting" KPI tile intent-to-filter
// wiring, unchanged from the inline version it replaces.
const useReportsIntentEffect = (
    reportsIntent: { kind: "waiting"; nonce: number } | null,
    setView: (view: ReportView) => void,
    setFilter: (filter: TicketRowFilter) => void,
): void => {
    // Deliberately keyed on `reportsIntent` alone (not `setView`/`setFilter`,
    // which are stable setState identities anyway) — this should fire once
    // per nonce bump (a fresh Dashboard click), not on every render.
    useEffect(() => {
        if (reportsIntent?.kind === "waiting") {
            setView("tickets");
            setFilter("half");
        }
    }, [reportsIntent, setView, setFilter]);
};

// Split out of useReportsScreenController (over the line/complexity budget —
// docs/CodingStandards.md) — wires the two existing derived-data/handler
// hooks (useSavedReportActions, useReportsScreenData) off the shared filter
// state, so the controller itself only assembles the pieces.
const useReportsScreenDerivedData = (
    filters: ReturnType<typeof useReportsScreenFilters>,
    args: Omit<UseReportsScreenControllerArgs, "reportsIntent">,
) => {
    const { db, docs, onOpenTicket, amountDp, weightUnit, dateFmt, timeFmt, currentEpoch, styles, t, lang } = args;
    const { view, groupBy, filter, setView, setGroupBy, setFilter, dateFrom, dateTo, setDateFrom, setDateTo, visibleColumnKeys, setVisibleColumnKeys } =
        filters;

    const savedReportActions = useSavedReportActions({
        db,
        view,
        groupBy,
        filter,
        dateFrom,
        dateTo,
        visibleColumnKeys,
        setView,
        setGroupBy,
        setFilter,
        setDateFrom,
        setDateTo,
        setVisibleColumnKeys,
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
    });

    return { savedReportActions, screenData };
};

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — bundles the screen's own local state
// (view/query/filter/date-range/groupBy/printOpen) together with the two
// existing derived-data/handler hooks (useSavedReportActions,
// useReportsScreenData) so ReportsScreen itself only calls one hook.
export const useReportsScreenController = (args: UseReportsScreenControllerArgs) => {
    const { dateFmt, reportsIntent } = args;
    const filters = useReportsScreenFilters();
    const { setView, setFilter, query, filter, dateFrom, dateTo, sortKey, sortDir, setPageIndex } = filters;
    const { savedReportActions, screenData } = useReportsScreenDerivedData(filters, args);

    const showWaiting = (): void => {
        setView("tickets");
        setFilter("half");
    };

    useReportsIntentEffect(reportsIntent, setView, setFilter);
    useResetPageOnFilterChange({ setPageIndex, query, filter, dateFrom, dateTo, sortKey, sortDir });

    return { ...filters, savedReportActions, showWaiting, dateFmt, ...screenData };
};

export type UseReportsScreenController = ReturnType<typeof useReportsScreenController>;
