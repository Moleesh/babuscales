import { describe, expect, it } from "vitest";

import {
    filterOptions,
    groupLabel,
    groupOptions,
    viewOptions,
    GROUP_KEY_VALUES,
    TICKET_ROW_FILTER_VALUES,
} from "./reportRows";

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
