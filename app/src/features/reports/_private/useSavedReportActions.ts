import { useEffect, useState } from "react";

import type { DataPort } from "@db/DataPort";
import { addReportDef, deleteReportDef, loadReportDefs } from "@db/reportDefs";
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

export interface UseSavedReportActions {
    savedReports: ReportDefinition[];
    newReportName: string;
    setNewReportName: (name: string) => void;
    handleSaveReport: () => void;
    handleRecallReport: (def: ReportDefinition) => void;
    handleDeleteReport: (id: string) => void;
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

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the saved-report-definitions
// save/recall/delete handlers, unchanged from the inline version it
// replaces.
export const useSavedReportActions = ({
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
}: UseSavedReportActionsArgs): UseSavedReportActions => {
    const [savedReports, setSavedReports] = useLoadedReportDefs(db);
    const [newReportName, setNewReportName] = useState("");

    const handleSaveReport = (): void => {
        const name = newReportName.trim();
        if (!name) return;
        void addReportDef(db, buildSaveArgs({ view, groupBy, filter, dateFrom, dateTo, visibleColumnKeys }, name))
            .then(() => loadReportDefs(db))
            .then((defs) => {
                setSavedReports(defs);
                setNewReportName("");
            });
    };

    const handleRecallReport = (def: ReportDefinition): void => {
        if (def.View === "tickets" || def.View === "summary") setView(def.View);
        if (GROUP_KEY_VALUES.includes(def.GroupBy as GroupKey)) {
            setGroupBy(def.GroupBy as GroupKey);
        }
        if (TICKET_ROW_FILTER_VALUES.includes(def.Filter as TicketRowFilter)) {
            setFilter(def.Filter as TicketRowFilter);
        }
        setDateFrom(def.DateFrom ?? "");
        setDateTo(def.DateTo ?? "");
        setVisibleColumnKeys(parseSavedColumns(def.Columns));
    };

    const handleDeleteReport = (id: string): void => {
        void deleteReportDef(db, id)
            .then(() => loadReportDefs(db))
            .then(setSavedReports);
    };

    return {
        savedReports,
        newReportName,
        setNewReportName,
        handleSaveReport,
        handleRecallReport,
        handleDeleteReport,
    };
};
