import { describe, expect, it } from "vitest";

import { buildSummaryColumns, buildTicketColumns } from "./reportColumns";

// Task: extend i18n coverage to Reports — buildTicketColumns/buildSummaryColumns
// gained a required `t` param so their DataTable column headers translate.
// A fake `t` that echoes the key back proves every header actually routes
// through `t` rather than staying a hardcoded English literal.
const fakeT = (key: string): string => `[${key}]`;
const noopStyles = {} as CSSModuleClasses;

describe("buildTicketColumns: headers route through t", () => {
    it("translates every non-empty header", () => {
        const columns = buildTicketColumns({
            onOpenTicket: () => undefined,
            amountDp: 2,
            styles: noopStyles,
            t: fakeT,
            lang: "en",
        });
        const headers = columns
            .map((c) => c.header)
            .filter((h): h is string => typeof h === "string" && h !== "");
        expect(headers.length).toBeGreaterThan(0);
        expect(headers.every((h) => h.startsWith("["))).toBe(true);
    });
});

describe("buildSummaryColumns: headers route through t", () => {
    it("translates every header, including the group-by key column", () => {
        const columns = buildSummaryColumns({ groupBy: "material", amountDp: 0, t: fakeT });
        expect(columns.every((c) => typeof c.header === "string" && c.header.startsWith("["))).toBe(
            true,
        );
    });
});
