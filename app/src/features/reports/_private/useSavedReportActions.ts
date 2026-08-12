import { useEffect, useState } from "react";

import type { DataPort } from "@db/DataPort";
import { addReportDef, deleteReportDef, loadReportDefs } from "@db/reportDefs";
import type { ReportDefinition } from "@db/reportDefs";

import { GROUP_KEY_VALUES, TICKET_ROW_FILTER_VALUES } from "../reportRows";
import type { GroupKey, ReportView, TicketRowFilter } from "../reportRows";

export interface UseSavedReportActionsArgs {
    db: DataPort;
    view: ReportView;
    groupBy: GroupKey;
    filter: TicketRowFilter;
    setView: (view: ReportView) => void;
    setGroupBy: (groupBy: GroupKey) => void;
    setFilter: (filter: TicketRowFilter) => void;
}

export interface UseSavedReportActions {
    savedReports: ReportDefinition[];
    newReportName: string;
    setNewReportName: (name: string) => void;
    handleSaveReport: () => void;
    handleRecallReport: (def: ReportDefinition) => void;
    handleDeleteReport: (id: string) => void;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — task #54's saved-report-definitions load
// effect and save/recall/delete handlers, unchanged from the inline
// version it replaces.
export const useSavedReportActions = ({
    db,
    view,
    groupBy,
    filter,
    setView,
    setGroupBy,
    setFilter,
}: UseSavedReportActionsArgs): UseSavedReportActions => {
    const [savedReports, setSavedReports] = useState<ReportDefinition[]>([]);
    const [newReportName, setNewReportName] = useState("");

    useEffect(() => {
        let cancelled = false;
        void loadReportDefs(db).then((defs) => {
            if (!cancelled) setSavedReports(defs);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    const handleSaveReport = (): void => {
        const name = newReportName.trim();
        if (!name) return;
        void addReportDef(db, { Name: name, View: view, GroupBy: groupBy, Filter: filter })
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
