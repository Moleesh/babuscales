import { describe, expect, it } from "vitest";

import {
    filterOptions,
    filterRowsByDateRange,
    filterRowsBySeries,
    filterTicketRows,
    groupLabel,
    groupOptions,
    listSeriesEpochOptions,
    viewOptions,
    GROUP_KEY_VALUES,
    TICKET_ROW_FILTER_VALUES,
} from "./reportRows";
import type { TicketRow } from "./reportRows";

// Task: extend i18n coverage to Reports — these option-builders/labels used
// to be static arrays of English strings; now they're functions of `t` so a
// pure (non-component) caller like reportColumns.tsx can translate them
// without needing hook access. A fake `t` that just echoes back the key
// (prefixed, so a raw pass-through bug is visible) is enough to prove the
// wiring — the real translations are covered by App.tsx's i18n integration.
const fakeT = (key: string): string => `[${key}]`;

describe("viewOptions/filterOptions/groupOptions: translate every label", () => {
    it("viewOptions labels every value through t", () => {
        expect(viewOptions(fakeT)).toEqual([
            { value: "tickets", label: "[reports.view.tickets]" },
            { value: "summary", label: "[reports.view.summary]" },
        ]);
    });

    it("filterOptions labels every value through t", () => {
        expect(filterOptions(fakeT).map((o) => o.value)).toEqual(["all", "half", "both"]);
        expect(filterOptions(fakeT).every((o) => o.label.startsWith("["))).toBe(true);
    });

    it("groupOptions labels every value through t", () => {
        expect(groupOptions(fakeT).map((o) => o.value)).toEqual(GROUP_KEY_VALUES);
        expect(groupOptions(fakeT).every((o) => o.label.startsWith("["))).toBe(true);
    });
});

describe("groupLabel", () => {
    it("finds the label for a known group key", () => {
        expect(groupLabel("party", fakeT)).toBe("[reports.group.party]");
    });

    it("falls back to reports.group.fallback for an unknown key", () => {
        // Cast past the type system — this guards the runtime fallback a
        // corrupted/legacy saved-report definition could still hit.
        expect(groupLabel("bogus" as never, fakeT)).toBe("[reports.group.fallback]");
    });
});

describe("value-only option lists (no t needed)", () => {
    it("TICKET_ROW_FILTER_VALUES matches filterOptions' values", () => {
        expect(TICKET_ROW_FILTER_VALUES).toEqual(filterOptions(fakeT).map((o) => o.value));
    });

    it("GROUP_KEY_VALUES matches groupOptions' values", () => {
        expect(GROUP_KEY_VALUES).toEqual(groupOptions(fakeT).map((o) => o.value));
    });
});

// Task: fresh-series reset — "Reset the counter now" bumps `SeriesEpoch`
// without touching existing ticket rows, so old/backed tickets need a pure
// display filter (never a query-level exclusion) to stop looking like
// duplicates of the new series in Reports' default view.
describe("filterRowsBySeries", () => {
    const rowAt = (seriesEpoch: number): TicketRow =>
        ({ seriesEpoch }) as TicketRow;
    const rows = [rowAt(1), rowAt(2), rowAt(2)];

    it("keeps only rows matching the given epoch", () => {
        expect(filterRowsBySeries(rows, 2)).toEqual([rowAt(2), rowAt(2)]);
    });

    it("scopes to a single prior epoch, never merging across series", () => {
        expect(filterRowsBySeries(rows, 1)).toEqual([rowAt(1)]);
    });

    it("returns an empty array when nothing matches the given epoch", () => {
        expect(filterRowsBySeries(rows, 99)).toEqual([]);
    });
});

describe("filterTicketRows", () => {
    const rowAt = (overrides: Partial<TicketRow>): TicketRow =>
        ({
            docSeq: null,
            vehicleNo: "",
            party: "",
            material: "",
            challanNo: "",
            isOpen: false,
            netKg: null,
            ...overrides,
        }) as TicketRow;

    it("finds a ticket numbered 0 by its own number", () => {
        const rows = [rowAt({ docSeq: 0 }), rowAt({ docSeq: 5 })];
        expect(filterTicketRows(rows, "0", "all")).toEqual([rowAt({ docSeq: 0 })]);
    });

    it("still excludes rows with no matching field when searching", () => {
        const rows = [rowAt({ docSeq: 1 }), rowAt({ docSeq: 5 })];
        expect(filterTicketRows(rows, "5", "all")).toEqual([rowAt({ docSeq: 5 })]);
    });
});

describe("filterRowsByDateRange", () => {
    const rowAt = (at: string): TicketRow => ({ at }) as TicketRow;
    const rows = [rowAt("2024-01-05T00:00:00Z"), rowAt("2024-01-15T00:00:00Z")];

    it("returns rows unchanged when no bounds are set", () => {
        expect(filterRowsByDateRange(rows, "", "")).toEqual(rows);
    });

    it("filters to the inclusive range when from <= to", () => {
        expect(filterRowsByDateRange(rows, "2024-01-01", "2024-01-10")).toEqual([rows[0]]);
    });

    it("treats an inverted range (from > to) as no date filter", () => {
        expect(filterRowsByDateRange(rows, "2024-01-15", "2024-01-05")).toEqual(rows);
    });
});

describe("listSeriesEpochOptions", () => {
    const rowAt = (seriesEpoch: number, at: string): TicketRow => ({ seriesEpoch, at }) as TicketRow;
    const fakeT2 = (key: string): string => `[${key}]`;

    it("always lists the current epoch first", () => {
        const rows = [rowAt(1, "2024-01-01T00:00:00"), rowAt(2, "2024-02-01T00:00:00")];
        const options = listSeriesEpochOptions(rows, 2, fakeT2);
        expect(options[0]).toEqual({ epoch: 2, label: "[reports.series.current]" });
    });

    it("lists prior epochs newest-first, labelled with their earliest ticket date", () => {
        const rows = [
            rowAt(1, "2024-01-01T00:00:00"),
            rowAt(2, "2024-02-01T00:00:00"),
            rowAt(3, "2024-03-01T00:00:00"),
        ];
        const options = listSeriesEpochOptions(rows, 3, fakeT2);
        expect(options.map((o) => o.epoch)).toEqual([3, 2, 1]);
        expect(options[1]?.label).toBe("[reports.series.priorPrefix] 2024-02-01");
    });

    it("omits epochs with no rows", () => {
        const rows = [rowAt(2, "2024-02-01T00:00:00")];
        const options = listSeriesEpochOptions(rows, 2, fakeT2);
        expect(options).toEqual([{ epoch: 2, label: "[reports.series.current]" }]);
    });
});
