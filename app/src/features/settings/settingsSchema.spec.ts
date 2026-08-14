import { describe, expect, it } from "vitest";

import { DEFAULT_NUMBERING, ruleDefs, settingsBodySchema } from "./settingsSchema";

// Task: t-threaded settings label/note builders (mirrors reportRows.ts's
// viewOptions(t) precedent — reportRows.spec.ts's own fakeT pattern).
const fakeT = (key: string): string => `[${key}]`;

describe("ruleDefs(t)", () => {
    it("returns exactly the four WeighingRules keys, in order", () => {
        const defs = ruleDefs(fakeT);
        expect(defs.map((d) => d[0])).toEqual([
            "StrictTare",
            "SameTicketNo",
            "ShowSendLorry",
            "ManualEntry",
        ]);
    });

    it("labels/notes every entry through t with the expected keys", () => {
        const defs = ruleDefs(fakeT);
        expect(defs).toEqual([
            ["StrictTare", "[settings.weighingRules.strictTare.label]", "[settings.weighingRules.strictTare.note]"],
            [
                "SameTicketNo",
                "[settings.weighingRules.sameTicketNo.label]",
                "[settings.weighingRules.sameTicketNo.note]",
            ],
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
        expect(calls).toBe(8); // 4 rules x (label + note)
    });
});

// Task: fresh-series reset — `Numbering.CurrentEpoch` needs to `.default(1)`
// so a settings row saved before this field existed still parses instead of
// failing whole-row (useSettingsRecord.ts's fallback to
// createDefaultSettingsRow), same reasoning as ShowSendLorry/ManualEntry/
// SameTicketNo (settingsSchema.ts's own comments).
describe("numberingSchema's CurrentEpoch", () => {
    const numberingSchema = settingsBodySchema.shape.Numbering;

    it("DEFAULT_NUMBERING has CurrentEpoch 1", () => {
        expect(DEFAULT_NUMBERING.CurrentEpoch).toBe(1);
    });

    it("defaults to 1 when missing from a legacy-saved numbering object", () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to drop it from `legacy`
        const { CurrentEpoch: _omit, ...legacy } = DEFAULT_NUMBERING;
        const parsed = numberingSchema.parse(legacy);
        expect(parsed.CurrentEpoch).toBe(1);
    });

    it("round-trips an explicit CurrentEpoch (e.g. after a reset)", () => {
        const parsed = numberingSchema.parse({ ...DEFAULT_NUMBERING, CurrentEpoch: 3 });
        expect(parsed.CurrentEpoch).toBe(3);
    });
});
