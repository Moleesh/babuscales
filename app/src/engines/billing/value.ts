// Ported from the mock's own live calc (demo/BabuScales-demo.html's
// `recalculate()`: `value: net != null && mat ? Math.round(net / 1000 * mat.rate) : null`)
// — the schema's own `Value` field (src/engines/schemaEngine's
// DEFAULT_TICKET_SCHEMA doesn't carry it; the mock's aspirational
// DEFAULT_SCHEMA upload fixture does: `Formula:"Round(Net / 1000 * Material.Rate, 0)"`).
// Hand-computed here rather than run through engines/formulaEngine, matching
// computeCharge's own precedent one file over: the mock's *actual* runtime
// value never interprets that formula string either, it's this one
// multiplication, so that's what's ported.
export const computeValue = (netKg: number | null, rate: number | null): number | null =>
    netKg !== null && rate !== null ? Math.round((netKg / 1000) * rate) : null;
