import type { JsonRecord } from "./types";

// Material's own field beyond generic Name/Notes — the mock's real `Value`
// computation (demo/BabuScale-demo.html's `recalculate()`:
// `Math.round(net / 1000 * mat.rate)`, MATERIALS' own `rate:` per row)
// needs a real per-material rate to read. Optional: a material with no
// Rate set just never produces a Value (@engines/billing's computeValue).
export const getMaterialRate = (body: JsonRecord): number | null =>
    typeof body.Rate === "number" ? body.Rate : null;
