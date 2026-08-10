import { useEffect, useMemo, useState } from "react";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Field, FieldGrid } from "@components/Field";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import { formatMoney, formatWeightKg } from "@constants/numberFormat";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { buildReportSlipData } from "@engines/print";
import { useSettings } from "@features/settings";
import { formatTicketNo } from "@features/weighing";

import { ReportPrintModal } from "./_private/ReportPrintModal";
import { buildSummaryPrintRows, buildTicketPrintRows } from "./reportPrintRows";
import { buildTicketRows, filterTicketRows, summarizeTicketRows } from "./reportRows";
import type { GroupKey, SummaryRow, TicketRow, TicketRowFilter } from "./reportRows";
import styles from "./ReportsScreen.module.css";

export interface ReportsScreenProps {
    /** Resumes (open ticket) or reopens (completed ticket, to reprint) into the shared Weighing deck and switches there. */
    onOpenTicket: (doc: DocRow) => void;
}

type ReportView = "tickets" | "summary";

const VIEW_OPTIONS: SegmentedOption<ReportView>[] = [
    { value: "tickets", label: "Tickets" },
    { value: "summary", label: "Summary" },
];

const FILTER_OPTIONS: SegmentedOption<TicketRowFilter>[] = [
    { value: "all", label: "All" },
    { value: "half", label: "Waiting for the second weight" },
    { value: "both", label: "Both weights" },
];

const GROUP_OPTIONS: { value: GroupKey; label: string }[] = [
    { value: "material", label: "Material" },
    { value: "party", label: "Party" },
    { value: "vehicleNo", label: "Vehicle" },
    { value: "transporter", label: "Transporter" },
];

const groupLabel = (key: GroupKey): string =>
    GROUP_OPTIONS.find((option) => option.value === key)?.label ?? "Group";

const formatWeightCell = (kg: number | null): string =>
    kg === null ? "—" : `${formatWeightKg(kg)} kg`;

// PLAN §13.1 — "there is no Tickets tab... a ticket list is a report that
// has not been grouped yet." One dataset (reportRows.ts), one toggle
// between the flat Tickets view and the grouped Summary view. Print is real
// (reportPrintRows.ts + ReportPrintModal, mirroring the per-ticket print
// engine — Phase-2 item 19/23). Export PDF/Excel/CSV are shown disabled
// rather than silently doing nothing — the mock's own buttons for these
// have no click handler at all (dead UI, not a corner this app cut), so
// there's nothing here to port yet (app/README.md known gap).
export const ReportsScreen = ({ onOpenTicket }: ReportsScreenProps) => {
    const db = useDataPort();
    const { settings } = useSettings();
    const [docs, setDocs] = useState<DocRow[]>([]);
    const [view, setView] = useState<ReportView>("tickets");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<TicketRowFilter>("all");
    const [groupBy, setGroupBy] = useState<GroupKey>("material");
    const [printOpen, setPrintOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (!cancelled) setDocs(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    const rows = useMemo(() => buildTicketRows(docs), [docs]);
    const waitingCount = useMemo(() => rows.filter((row) => row.isOpen).length, [rows]);
    const visibleRows = useMemo(() => filterTicketRows(rows, query, filter), [rows, query, filter]);
    const summaryRows = useMemo(() => summarizeTicketRows(rows, groupBy), [rows, groupBy]);

    // Mirrors the mock's own repRows(): whichever view is open decides both
    // the printed content and which underlying rows its date range is
    // computed from (summaryRows isn't affected by the tickets view's
    // search/filter, so its range comes from the same not-cancelled,
    // both-weights rows summarizeTicketRows itself totals, not visibleRows).
    const reportSlipData = useMemo(() => {
        if (view === "summary") {
            const { head, rows: printRows } = buildSummaryPrintRows(
                summaryRows,
                settings.Formats.AmountDp,
            );
            const timestamps = rows
                .filter((row) => !row.isCancelled && row.netKg !== null)
                .map((row) => row.at);
            return buildReportSlipData({
                title: "SUMMARY",
                head,
                rows: printRows,
                rowTimestamps: timestamps,
            });
        }
        const { head, rows: printRows } = buildTicketPrintRows(visibleRows);
        return buildReportSlipData({
            title: "TICKET REGISTER",
            head,
            rows: printRows,
            rowTimestamps: visibleRows.map((row) => row.at),
        });
    }, [view, summaryRows, rows, visibleRows, settings.Formats.AmountDp]);

    const showWaiting = (): void => {
        setView("tickets");
        setFilter("half");
    };

    const ticketColumns: DataTableColumn<TicketRow>[] = [
        {
            key: "no",
            header: "Ticket",
            render: (row) => <span className="num">{formatTicketNo(row.docSeq)}</span>,
        },
        { key: "veh", header: "Vehicle", render: (row) => row.vehicleNo || "—" },
        { key: "party", header: "Party", render: (row) => row.party || "—" },
        { key: "mat", header: "Material", render: (row) => row.material || "—" },
        {
            key: "tare",
            header: "Tare",
            numeric: true,
            render: (row) => formatWeightCell(row.tareKg),
        },
        {
            key: "gross",
            header: "Gross",
            numeric: true,
            render: (row) => formatWeightCell(row.grossKg),
        },
        { key: "net", header: "Net", numeric: true, render: (row) => formatWeightCell(row.netKg) },
        {
            key: "charge",
            header: "Charge",
            numeric: true,
            render: (row) =>
                row.charge === null ? "—" : formatMoney(row.charge, settings.Formats.AmountDp),
        },
        { key: "at", header: "At", render: (row) => new Date(row.at).toLocaleString() },
        {
            key: "status",
            header: "Status",
            render: (row) =>
                row.isCancelled ? (
                    <span className={styles.cancelled}>Cancelled</span>
                ) : row.isOpen ? (
                    <span className={styles.waiting}>Waiting</span>
                ) : (
                    "Complete"
                ),
        },
        {
            key: "action",
            header: "",
            render: (row) =>
                row.isCancelled ? null : (
                    <Button onClick={() => onOpenTicket(row.doc)}>
                        {row.isOpen ? "Resume" : "Reprint"}
                    </Button>
                ),
        },
    ];

    const summaryColumns: DataTableColumn<SummaryRow>[] = [
        { key: "key", header: groupLabel(groupBy), render: (row) => row.key },
        {
            key: "count",
            header: "Tickets",
            numeric: true,
            render: (row) => <span className="num">{row.ticketCount}</span>,
        },
        {
            key: "tonnes",
            header: "Net tonnes",
            numeric: true,
            render: (row) => <span className="num">{row.netTonnes.toFixed(2)}</span>,
        },
        {
            key: "charge",
            header: "Charge",
            numeric: true,
            render: (row) => (
                <span className="num">{formatMoney(row.charge, settings.Formats.AmountDp)}</span>
            ),
        },
    ];

    return (
        <div className={styles.screen}>
            <Card
                title={<span className="lbl">Reports</span>}
                headerRight={
                    <div className={styles.headerActions}>
                        <SegmentedControl
                            options={VIEW_OPTIONS}
                            value={view}
                            onChange={setView}
                            ariaLabel="View"
                        />
                        <button className="chip act" onClick={showWaiting}>
                            <span className={styles.dot} />
                            {waitingCount} waiting for a second weight
                        </button>
                    </div>
                }
            >
                <div className={styles.body}>
                    {view === "tickets" ? (
                        <>
                            <input
                                className={styles.search}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search vehicle, party, ticket no, challan…"
                                aria-label="Search tickets"
                            />
                            <SegmentedControl
                                options={FILTER_OPTIONS}
                                value={filter}
                                onChange={setFilter}
                                ariaLabel="Filter"
                            />
                            <DataTable
                                columns={ticketColumns}
                                rows={visibleRows}
                                getRowId={(row) => row.docId}
                                emptyMessage="Nothing matches that filter"
                            />
                        </>
                    ) : (
                        <>
                            <FieldGrid columns={2}>
                                <Field id="rGroup" label={{ en: "Group by" }}>
                                    <select
                                        id="rGroup"
                                        value={groupBy}
                                        onChange={(event) =>
                                            setGroupBy(event.target.value as GroupKey)
                                        }
                                    >
                                        {GROUP_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </FieldGrid>
                            <DataTable
                                columns={summaryColumns}
                                rows={summaryRows}
                                getRowId={(row) => row.key}
                                emptyMessage="No completed tickets in this group yet"
                            />
                        </>
                    )}
                    <div className={styles.actions}>
                        <Button variant="primary" onClick={() => setPrintOpen(true)}>
                            Print
                        </Button>
                        <Button disabled caption="Needs the print/export engine">
                            Export PDF
                        </Button>
                        <Button disabled caption="Needs the print/export engine">
                            Export Excel
                        </Button>
                        <Button disabled caption="Needs the print/export engine">
                            Export CSV
                        </Button>
                    </div>
                </div>
            </Card>
            <ReportPrintModal
                open={printOpen}
                onClose={() => setPrintOpen(false)}
                data={reportSlipData}
            />
        </div>
    );
};
