import { describe, expect, it } from "vitest";

import type { SummaryRow, TicketRow } from "./reportRows";
import { buildSummaryPrintRows, buildTicketPrintRows } from "./reportPrintRows";

const ticketRow = (overrides: Partial<TicketRow>): TicketRow =>
    ({
        docSeq: 1,
        vehicleNo: "TN01AB1234",
        party: "Acme",
        netKg: 1500,
        isCancelled: false,
        ...overrides,
    }) as TicketRow;

describe("buildTicketPrintRows", () => {
    it("head includes the weight unit", () => {
        expect(buildTicketPrintRows([], "kg").head).toEqual(["Ticket", "Vehicle", "Party", "Net kg"]);
        expect(buildTicketPrintRows([], "t").head[3]).toBe("Net t");
    });

    it("formats a completed row's net weight", () => {
        const rows = buildTicketPrintRows([ticketRow({ netKg: 1500 })], "kg").rows;
        expect(rows[0]?.[3]).not.toBe("open");
        expect(rows[0]?.[3]).not.toBe("CANCELLED");
    });

    it("shows 'open' for a row with no net weight yet", () => {
        const rows = buildTicketPrintRows([ticketRow({ netKg: null })], "kg").rows;
        expect(rows[0]?.[3]).toBe("open");
    });

    it("shows 'CANCELLED' for a cancelled row, even if it has a net weight", () => {
        const rows = buildTicketPrintRows([ticketRow({ netKg: 1500, isCancelled: true })], "kg").rows;
        expect(rows[0]?.[3]).toBe("CANCELLED");
    });

    it("blank vehicleNo/party render as em-dash", () => {
        const rows = buildTicketPrintRows([ticketRow({ vehicleNo: "", party: "" })], "kg").rows;
        expect(rows[0]?.[1]).toBe("—");
        expect(rows[0]?.[2]).toBe("—");
    });
});

describe("buildSummaryPrintRows", () => {
    const summaryRow = (overrides: Partial<SummaryRow>): SummaryRow => ({
        key: "Sand",
        ticketCount: 3,
        netTonnes: 4.567,
        charge: 1000,
        ...overrides,
    });

    it("head is fixed: Group, Tkts, Net t, Charge", () => {
        expect(buildSummaryPrintRows([], 2).head).toEqual(["Group", "Tkts", "Net t", "Charge"]);
    });

    it("rounds netTonnes to 1 decimal place", () => {
        const rows = buildSummaryPrintRows([summaryRow({ netTonnes: 4.567 })], 2).rows;
        expect(rows[0]?.[2]).toBe("4.6");
    });

    it("formats charge using the given decimal-places setting", () => {
        const rowsDp2 = buildSummaryPrintRows([summaryRow({ charge: 1000 })], 2).rows;
        expect(rowsDp2[0]?.[3]).toContain(".00");
        const rowsDp0 = buildSummaryPrintRows([summaryRow({ charge: 1000 })], 0).rows;
        expect(rowsDp0[0]?.[3]).not.toContain(".00");
    });

    it("passes through the group key and ticket count", () => {
        const rows = buildSummaryPrintRows([summaryRow({ key: "Gravel", ticketCount: 7 })], 2).rows;
        expect(rows[0]?.[0]).toBe("Gravel");
        expect(rows[0]?.[1]).toBe("7");
    });
});
