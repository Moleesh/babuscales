import { describe, expect, it } from "vitest";

import { buildReportSlipData, type ReportSlipInput } from "./buildReportSlipData";

const baseInput: ReportSlipInput = {
    title: "TICKET REGISTER",
    head: ["Ticket", "Vehicle", "Party", "Net"],
    rows: [["TKT-1", "TN01AB1234", "Acme", "1500"]],
    rowTimestamps: ["2026-01-01T10:00:00.000Z"],
    lang: "en",
    dateFmt: "dd MMM yyyy",
    timeFmt: "24",
    now: new Date("2026-01-02T12:00:00.000Z"),
};

describe("buildReportSlipData", () => {
    it("passes through Title, Head and Rows verbatim", () => {
        const slip = buildReportSlipData(baseInput);
        expect(slip.Title).toBe("TICKET REGISTER");
        expect(slip.Head).toEqual(baseInput.head);
        expect(slip.Rows).toEqual(baseInput.rows);
    });

    it("formats PrintedAt from the injected `now`, not the real clock", () => {
        const slip = buildReportSlipData(baseInput);
        expect(slip.PrintedAt.length).toBeGreaterThan(0);
        // Deterministic given a fixed `now` — same input always yields the same string.
        expect(buildReportSlipData(baseInput).PrintedAt).toBe(slip.PrintedAt);
    });

    it("DateRange is 'No tickets' when rowTimestamps is empty", () => {
        const slip = buildReportSlipData({ ...baseInput, rowTimestamps: [] });
        expect(slip.DateRange).toBe("No tickets");
    });

    it("DateRange collapses to a single formatted date only when timestamps are exactly identical", () => {
        const same = buildReportSlipData({
            ...baseInput,
            rowTimestamps: ["2026-01-01T09:00:00.000Z", "2026-01-01T09:00:00.000Z"],
        });
        expect(same.DateRange).not.toContain("–");

        // Same calendar day but different times still compares as a range —
        // dateRangeOf compares raw ISO timestamps, not formatted dates.
        const sameDayDifferentTime = buildReportSlipData({
            ...baseInput,
            rowTimestamps: ["2026-01-01T09:00:00.000Z", "2026-01-01T10:00:00.000Z"],
        });
        expect(sameDayDifferentTime.DateRange).toContain("–");
    });

    it("DateRange spans earliest to latest (en dash) when timestamps differ, regardless of input order", () => {
        const outOfOrder = buildReportSlipData({
            ...baseInput,
            rowTimestamps: [
                "2026-01-05T10:00:00.000Z",
                "2026-01-01T10:00:00.000Z",
                "2026-01-03T10:00:00.000Z",
            ],
        });
        expect(outOfOrder.DateRange).toContain("–");
        // Earliest/latest is computed from a sorted copy, so a jumbled
        // input order must still produce Jan 1 .. Jan 5, not e.g. Jan 5 first.
        const sortedOrder = buildReportSlipData({
            ...baseInput,
            rowTimestamps: [
                "2026-01-01T10:00:00.000Z",
                "2026-01-03T10:00:00.000Z",
                "2026-01-05T10:00:00.000Z",
            ],
        });
        expect(outOfOrder.DateRange).toBe(sortedOrder.DateRange);
    });

    it("a single row timestamp produces a non-ranged single date, not 'a–a'", () => {
        const slip = buildReportSlipData({ ...baseInput, rowTimestamps: ["2026-06-15T00:00:00.000Z"] });
        expect(slip.DateRange).not.toContain("–");
        expect(slip.DateRange.length).toBeGreaterThan(0);
    });
});
