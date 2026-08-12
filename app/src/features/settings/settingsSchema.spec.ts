import { describe, expect, it } from "vitest";

import { fixedPolicy, ruleDefs } from "./settingsSchema";

// Task: t-threaded settings label/note builders (mirrors reportRows.ts's
// viewOptions(t) precedent — reportRows.spec.ts's own fakeT pattern).
const fakeT = (key: string): string => `[${key}]`;

describe("ruleDefs(t)", () => {
    it("returns exactly the six WeighingRules keys, in order", () => {
        const defs = ruleDefs(fakeT);
        expect(defs.map((d) => d[0])).toEqual([
            "TareFirst",
            "StrictTare",
            "AutoCapture",
            "MultiGross",
            "ShowSendLorry",
            "ManualEntry",
        ]);
    });

    it("labels/notes every entry through t with the expected keys", () => {
        const defs = ruleDefs(fakeT);
        expect(defs).toEqual([
            ["TareFirst", "[settings.weighingRules.tareFirst.label]", "[settings.weighingRules.tareFirst.note]"],
            ["StrictTare", "[settings.weighingRules.strictTare.label]", "[settings.weighingRules.strictTare.note]"],
            ["AutoCapture", "[settings.weighingRules.autoCapture.label]", "[settings.weighingRules.autoCapture.note]"],
            ["MultiGross", "[settings.weighingRules.multiGross.label]", "[settings.weighingRules.multiGross.note]"],
            [
                "ShowSendLorry",
                "[settings.weighingRules.showSendLorry.label]",
                "[settings.weighingRules.showSendLorry.note]",
            ],
            [
                "ManualEntry",
                "[settings.weighingRules.manualEntry.label]",
                "[settings.weighingRules.manualEntry.note]",
            ],
        ]);
    });

    it("every label/note is actually routed through the given t function, not hardcoded", () => {
        let calls = 0;
        ruleDefs((key) => {
            calls++;
            return key;
        });
        expect(calls).toBe(12); // 6 rules x (label + note)
    });
});

describe("fixedPolicy(t)", () => {
    it("returns exactly three rows: reprints, cancellation, noFile", () => {
        const rows = fixedPolicy(fakeT);
        expect(rows).toEqual([
            ["[settings.fixedPolicy.reprints.title]", "[settings.fixedPolicy.reprints.detail]"],
            ["[settings.fixedPolicy.cancellation.title]", "[settings.fixedPolicy.cancellation.detail]"],
            ["[settings.fixedPolicy.noFile.title]", "[settings.fixedPolicy.noFile.detail]"],
        ]);
    });

    it("every title/detail is routed through the given t function", () => {
        let calls = 0;
        fixedPolicy((key) => {
            calls++;
            return key;
        });
        expect(calls).toBe(6); // 3 rows x (title + detail)
    });
});
