import { useEffect, useMemo, useState } from "react";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { DataTable } from "@components/DataTable";
import type { DataTableColumn } from "@components/DataTable";
import { Field, FieldGrid } from "@components/Field";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import { formatMoney, formatWeightKg } from "@constants/numberFormat";
import { addReportDef, deleteReportDef, loadReportDefs } from "@db/reportDefs";
import type { ReportDefinition } from "@db/reportDefs";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { toCsvBlob, toXlsxBlob } from "@engines/export";
import { buildReportSlipData } from "@engines/print";
import { useSettings } from "@features/settings";
import { formatTicketNo } from "@features/weighing";

import { ReportPrintModal } from "./_private/ReportPrintModal";
import { SavedReportsRow } from "./_private/SavedReportsRow";
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

// Same `YYYYMMDD-HHMM` shape as settings/_private/BackupRestoreCard.tsx's
// own timestampForFilename — not imported from there since that module
// lives in settings' `_private` folder (feature-private by convention);
// two lines of duplication beats reaching across that boundary.
const timestampForFilename = (): string => {
    const now = new Date();
    const pad = (n: number): string => String(n).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
};

const slugifyTitle = (title: string): string => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Same plain Blob-download mechanism as BackupRestoreCard.tsx's
// handleExport — browser-native, works identically in the web demo and
// the real Tauri build, no dialog plugin needed.
const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

// PLAN §13.1 — "there is no Tickets tab... a ticket list is a report that
// has not been grouped yet." One dataset (reportRows.ts), one toggle
// between the flat Tickets view and the grouped Summary view. Print is real
// (reportPrintRows.ts + ReportPrintModal, mirroring the per-ticket print
// engine — Phase-2 item 19/23). Export CSV/Excel are real too
// (engines/export — hand-rolled CSV and OOXML .xlsx writers, task #53),
// reusing reportSlipData's own Head/Rows so an export can never drift from
// what Print sends to the slip. Export PDF stays disabled: the OS print
// dialog's own "Save as PDF" already covers it via the Print button, so a
// distinct PDF export path wasn't built.
//
// Saved report definitions (task #54, db/reportDefs.ts) — name the current
// (view, group-by, filter) combination and recall it later with one click.
// Deliberately not the fuller "visual query builder over the dynamic
// schema" PLAN §18 describes — reportDefs.ts's own comment has the full
// reasoning; the short version is task #50 never built schema-driven field
// rendering, so there's no dynamic field data yet to build a query builder
// over, and the reference mock never built one either.
export const ReportsScreen = ({ onOpenTicket }: ReportsScreenProps) => {
    const db = useDataPort();
    const { settings } = useSettings();
    const [docs, setDocs] = useState<DocRow[]>([]);
    const [view, setView] = useState<ReportView>("tickets");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<TicketRowFilter>("all");
    const [groupBy, setGroupBy] = useState<GroupKey>("material");
    const [printOpen, setPrintOpen] = useState(false);
    const [savedReports, setSavedReports] = useState<ReportDefinition[]>([]);
    const [newReportName, setNewReportName] = useState("");

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (!cancelled) setDocs(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    useEffect(() => {
        let cancelled = false;
        void loadReportDefs(db).then((defs) => {
            if (!cancelled) setSavedReports(defs);
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
        if (GROUP_OPTIONS.some((option) => option.value === def.GroupBy)) {
            setGroupBy(def.GroupBy as GroupKey);
        }
        if (FILTER_OPTIONS.some((option) => option.value === def.Filter)) {
            setFilter(def.Filter as TicketRowFilter);
        }
    };

    const handleDeleteReport = (id: string): void => {
        void deleteReportDef(db, id)
            .then(() => loadReportDefs(db))
            .then(setSavedReports);
    };

    // Reuses reportSlipData's own Head/Rows/Title — the same data the
    // Print button sends to the slip renderer — so an exported file can
    // never drift from what gets printed.
    const exportFilenameBase = `babuscales-report-${slugifyTitle(reportSlipData.Title)}-${timestampForFilename()}`;

    const handleExportCsv = (): void => {
        downloadBlob(toCsvBlob(reportSlipData.Head, reportSlipData.Rows), `${exportFilenameBase}.csv`);
    };

    const handleExportXlsx = (): void => {
        downloadBlob(
            toXlsxBlob(reportSlipData.Title, reportSlipData.Head, reportSlipData.Rows),
            `${exportFilenameBase}.xlsx`,
        );
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
                    <SavedReportsRow
                        savedReports={savedReports}
                        newName={newReportName}
                        onNewNameChange={setNewReportName}
                        onSave={handleSaveReport}
                        onRecall={handleRecallReport}
                        onDelete={handleDeleteReport}
                    />
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
                        <Button disabled caption="Use Print → Save as PDF from the OS print dialog">
                            Export PDF
                        </Button>
                        <Button onClick={handleExportXlsx}>Export Excel</Button>
                        <Button onClick={handleExportCsv}>Export CSV</Button>
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
