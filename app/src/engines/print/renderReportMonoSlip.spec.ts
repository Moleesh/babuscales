import { describe, expect, it } from "vitest";

import { renderReportMatrixSlip, renderReportThermalSlip } from "./renderReportMonoSlip";
import type { ReportSlipData } from "./types";

const baseSlip: ReportSlipData = {
    Title: "TICKET REGISTER",
    DateRange: "01 Jan 2026",
    Head: ["Ticket", "Vehicle", "Party", "Net"],
    Rows: [
        ["TKT-1", "TN01AB1234", "Acme", "1500"],
        ["TKT-2", "TN02CD5678", "Beta", "2200"],
    ],
    PrintedAt: "02 Jan 2026 12:00",
};

describe("renderReportMatrixSlip", () => {
    it("uses only columns 0, 1 and 3 (Party column dropped for the narrow roll)", () => {
        const out = renderReportMatrixSlip(baseSlip);
        expect(out).toContain("TKT-1");
        expect(out).toContain("TN01AB1234");
        expect(out).toContain("1500");
        expect(out).not.toContain("Acme");
    });

    it("renders one line per row", () => {
        const out = renderReportMatrixSlip(baseSlip);
        expect(out).toContain("TKT-1");
        expect(out).toContain("TKT-2");
    });

    it("handles an empty Rows array without throwing", () => {
        expect(() => renderReportMatrixSlip({ ...baseSlip, Rows: [] })).not.toThrow();
    });

    it("tolerates a short row (missing columns) rather than throwing", () => {
        expect(() => renderReportMatrixSlip({ ...baseSlip, Rows: [["only-one"]] })).not.toThrow();
    });
});

describe("renderReportThermalSlip", () => {
    it("keeps only the name (col 0) and headline number (col 3)", () => {
        const out = renderReportThermalSlip(baseSlip);
        expect(out).toContain("TKT-1");
        expect(out).toContain("1500");
        expect(out).not.toContain("TN01AB1234");
        expect(out).not.toContain("Acme");
    });

    it("handles an empty Rows array without throwing", () => {
        expect(() => renderReportThermalSlip({ ...baseSlip, Rows: [] })).not.toThrow();
    });
});
