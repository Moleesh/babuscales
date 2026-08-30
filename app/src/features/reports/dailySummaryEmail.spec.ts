import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Capture } from "@db/ticketBody";
import type { DocRow } from "@db/types";

import {
    buildDailySummaryEmail,
    isMoreThanOneDayLate,
    nowLocalHm,
    todayLocalDate,
} from "./dailySummaryEmail";

const capture = (overrides: Partial<Capture>): Capture => ({
    CaptureId: "c1",
    Type: "Tare",
    WeightKg: 1000,
    At: "2026-01-01T00:00:00.000Z",
    Operator: "Op",
    Source: "Indicator",
    Images: [],
    ...overrides,
});

let seq = 0;
const doc = (overrides: {
    material?: string;
    charge?: string | null;
    isCancelled?: boolean;
    captures?: Capture[];
    createdAt?: string;
}): DocRow => {
    seq += 1;
    return {
        DocId: `doc-${seq}`,
        DocKind: "Ticket",
        ProfileId: "p1",
        SeriesEpoch: 1,
        DocSeq: seq,
        IsCancelled: overrides.isCancelled ?? false,
        Body: {
            BodyVersion: 1,
            Material: overrides.material ?? "Sand",
            ...(overrides.charge !== undefined && overrides.charge !== null ? { Charge: overrides.charge } : {}),
            Captures:
                overrides.captures ?? [
                    capture({ Type: "Tare", WeightKg: 1000, At: "2026-01-01T09:00:00.000Z" }),
                    capture({ Type: "Gross", WeightKg: 2500, At: "2026-01-01T10:00:00.000Z", CaptureId: "c2" }),
                ],
        },
        CreatedAt: overrides.createdAt ?? "2026-01-01T10:00:00.000Z",
        UpdatedAt: overrides.createdAt ?? "2026-01-01T10:00:00.000Z",
        BodyHash: "h",
    };
};

describe("buildDailySummaryEmail", () => {
    it("subject includes the given date", () => {
        const email = buildDailySummaryEmail([], "2026-01-01", 2);
        expect(email.subject).toBe("BabuScales daily summary — 2026-01-01");
    });

    it("counts only completed (both weights, not cancelled) tickets toward net/charge totals", () => {
        const completed = doc({ charge: "100" });
        const cancelled = doc({ isCancelled: true, charge: "50" });
        const open = doc({ captures: [capture({ Type: "Tare" })] }); // only one weight -> open

        const email = buildDailySummaryEmail([completed, cancelled, open], "2026-01-01", 2);
        // active = completed + open (cancelled excluded); Tickets count = active.length
        expect(email.body).toContain("Tickets: 2");
        // Net/charge totals only from `completed` (both weights, active)
        expect(email.body).toContain("Net weighed: 1.50 t");
        expect(email.body).toContain("100.00");
    });

    it("filters strictly to docs whose local date matches dateIso", () => {
        const today = doc({ createdAt: "2026-01-01T10:00:00.000Z" });
        const yesterday = doc({
            captures: [
                capture({ Type: "Tare", At: "2025-12-31T09:00:00.000Z" }),
                capture({ Type: "Gross", At: "2025-12-31T10:00:00.000Z", CaptureId: "c2" }),
            ],
            createdAt: "2025-12-31T10:00:00.000Z",
        });
        const email = buildDailySummaryEmail([today, yesterday], "2026-01-01", 2);
        expect(email.body).toContain("Tickets: 1");
    });

    it("lists a by-material breakdown when there are completed tickets", () => {
        const email = buildDailySummaryEmail([doc({ material: "Gravel", charge: "40" })], "2026-01-01", 2);
        expect(email.body).toContain("By material:");
        expect(email.body).toContain("Gravel");
    });

    it("reports 'No completed tickets today.' when there are none", () => {
        const email = buildDailySummaryEmail([], "2026-01-01", 2);
        expect(email.body).toContain("No completed tickets today.");
        expect(email.body).not.toContain("By material:");
    });

    it("empty docs list produces a zero-ticket, zero-total summary without throwing", () => {
        const email = buildDailySummaryEmail([], "2026-01-01", 2);
        expect(email.body).toContain("Tickets: 0");
        expect(email.body).toContain("Net weighed: 0.00 t");
    });
});

describe("isMoreThanOneDayLate", () => {
    it("false when lastSentDate is null (never sent yet)", () => {
        expect(isMoreThanOneDayLate(null, "2026-01-05")).toBe(false);
    });

    it("false when the gap is exactly one day or less", () => {
        expect(isMoreThanOneDayLate("2026-01-04", "2026-01-05")).toBe(false);
    });

    it("true once the gap exceeds one day", () => {
        expect(isMoreThanOneDayLate("2026-01-01", "2026-01-05")).toBe(true);
    });

    it("false for a same-day (zero gap) comparison", () => {
        expect(isMoreThanOneDayLate("2026-01-05", "2026-01-05")).toBe(false);
    });
});

describe("todayLocalDate / nowLocalHm", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 15, 8, 5)); // local: 15 Jun 2026, 08:05
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("todayLocalDate formats the local date as yyyy-MM-dd", () => {
        expect(todayLocalDate()).toBe("2026-06-15");
    });

    it("nowLocalHm zero-pads hours and minutes", () => {
        expect(nowLocalHm()).toBe("08:05");
    });
});
