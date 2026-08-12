import { useState } from "react";

import type { DataPort } from "@db/DataPort";
import type { DocRow } from "@db/types";

import { useReportsScreenData } from "./useReportsScreenData";
import { useSavedReportActions } from "./useSavedReportActions";
import type { GroupKey, ReportView, TicketRowFilter, Translate } from "../reportRows";

export interface UseReportsScreenControllerArgs {
    db: DataPort;
    docs: DocRow[];
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    styles: CSSModuleClasses;
    t: Translate;
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
    };
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
}: UseReportsScreenControllerArgs) => {
    const filters = useReportsScreenFilters();
    const { view, groupBy, filter, setView, setGroupBy, setFilter } = filters;

    const savedReportActions = useSavedReportActions({
        db,
        view,
        groupBy,
        filter,
        setView,
        setGroupBy,
        setFilter,
    });
    const screenData = useReportsScreenData({
        docs,
        ...filters,
        onOpenTicket,
        amountDp,
        styles,
        t,
    });

    const showWaiting = (): void => {
        setView("tickets");
        setFilter("half");
    };

    return { ...filters, savedReportActions, showWaiting, ...screenData };
};
