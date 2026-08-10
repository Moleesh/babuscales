import { lpad, rpad } from "./pad";
import type { ReportSlipData } from "./types";

// Ported from the mock's reportMx — narrower paper drops a column (Party,
// on the ticket register; the group's own name never needs dropping on the
// summary) rather than wrapping text, the same choice the mock makes for
// every narrow-roll render. Only Head/Rows columns 0, 1 and 3 are used —
// mirrors the mock's own `d.head[0]`/`d.head[1]`/`d.head[3]` indexing.
export const renderReportMatrixSlip = (p: ReportSlipData): string => {
    const lines = p.Rows.map(
        (r) => ` ${rpad(r[0] ?? "", 12)}${rpad(r[1] ?? "", 16)}${lpad(r[3] ?? "", 11)}`,
    );
    return (
        `${lpad(p.Title, 28)}\n` +
        ` ${rpad(p.DateRange, 38)}\n` +
        "----------------------------------------\n" +
        ` ${rpad(p.Head[0] ?? "", 12)}${rpad(p.Head[1] ?? "", 16)}${lpad(p.Head[3] ?? "", 11)}\n` +
        lines.join("\n") +
        "\n----------------------------------------"
    );
};

// Ported from the mock's reportTh — a narrow roll keeps only the row's
// name (column 0) and its headline number (column 3): Net kg for the
// ticket register, Charge for the summary.
export const renderReportThermalSlip = (p: ReportSlipData): string => {
    const lines = p.Rows.map((r) => ` ${rpad(r[0] ?? "", 16)}${lpad(r[3] ?? "", 12)}`);
    return (
        `     ${p.Title}\n` +
        "------------------------------\n" +
        lines.join("\n") +
        "\n------------------------------"
    );
};
