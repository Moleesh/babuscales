import { useEffect, useState } from "react";

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
    styles: CSSModuleClasses;
    t: Translate;
    lang: string;
    /** Dashboard's "waiting" KPI tile navigates here wanting the "waiting on
     * a second weight" filter already applied — without this, the tab
     * switch always landed on the default Tickets/All view regardless of
     * which KPI sent the operator here (PLAN §21 bug report: "opens report
     * but it's not on the right tab"). Bumped by a counter, not a boolean,
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
    const [groupBy, setGroupBy] = useState<GroupKey>("material");
    const [printOpen, setPrintOpen] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);
    const [sortKey, setSortKey] = useState<TicketSortKey>("at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<TicketColumnKey[] | null>(null);
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
    };
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

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — bundles the screen's own local state
// (view/query/filter/date-range/groupBy/printOpen) together with the two
// existing derived-data/handler hooks (useSavedReportActions,
// useReportsScreenData) so ReportsScreen itself only calls one hook.
export const useReportsScreenController = ({
    db,
    docs,
    onOpenTicket,
    amountDp,
    styles,
    t,
    lang,
    reportsIntent,
}: UseReportsScreenControllerArgs) => {
    const filters = useReportsScreenFilters();
    const {
        view,
        groupBy,
        filter,
        setView,
        setGroupBy,
        setFilter,
        dateFrom,
        dateTo,
        setDateFrom,
        setDateTo,
        visibleColumnKeys,
        setVisibleColumnKeys,
    } = filters;

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
        styles,
        t,
        lang,
    });

    const showWaiting = (): void => {
        setView("tickets");
        setFilter("half");
    };

    useReportsIntentEffect(reportsIntent, setView, setFilter);

    return { ...filters, savedReportActions, showWaiting, ...screenData };
};

export type UseReportsScreenController = ReturnType<typeof useReportsScreenController>;
