import { fromString } from "@engines/formulaEngine/Decimal";

import type { JsonRecord } from "./types";

// Material's own field beyond generic Name/Notes — the mock's real `Value`
// computation (demo/BabuScales-demo.html's `recalculate()`:
// `Math.round(net / 1000 * mat.rate)`, MATERIALS' own `rate:` per row)
// needs a real per-material rate to read. Optional: a material with no
// Rate set just never produces a Value (@engines/billing's computeValue).
// Stored (and returned) as a decimal string — `@engines/billing`'s
// `computeValue` parses it with `Decimal.fromString`, never the lossy
// `fromInt`/`Number` path a plain JS number would need. A value that isn't a
// plain decimal literal (e.g. a stray non-numeric string) is treated as
// absent rather than thrown.
export const getMaterialRate = (body: JsonRecord): string | null => {
    if (typeof body.Rate !== "string") return null;
    try {
        fromString(body.Rate);
        return body.Rate;
    } catch {
        return null;
    }
};
