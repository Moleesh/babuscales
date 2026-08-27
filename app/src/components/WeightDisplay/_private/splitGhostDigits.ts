import { INDIAN_LOCALE } from "@constants/numberFormat";

export interface GhostSplit {
    /** Dim placeholder characters (digits + any grouping commas among
     * them) that stand in for digit places the live reading hasn't
     * reached yet. Empty once the live reading fills (or exceeds) the
     * ghost pattern's own digit count. */
    prefix: string;
    /** The real, live-formatted weight — exactly what a caller with no
     * ghost at all would have shown. */
    live: string;
}

// Bug: WeightDisplay used to render the ghost pattern and the live reading
// as two independently-formatted, separately-grouped strings stacked via
// CSS overlay (right-aligned on top of each other). Both use Indian
// lakh/crore grouping (INDIAN_LOCALE), and that grouping's comma positions
// shift depending on total digit count — so a short live reading (e.g.
// "6,680") laid under a wider ghost ("8,88,888") didn't line up with the
// ghost's own comma, and the ghost's leftover leading digits visually fused
// with the live reading's first digit into what read as a single, much
// larger (and wrong) number — e.g. a live 6,680 kg reading showing as
// "8,86,680". Reported as: bg ghost value should read 888,888-shaped but
// the live digits underneath came out misaligned/merged with it.
//
// Fixed by building ONE combined number (ghost padding digits glued in
// front of the real digits) and letting `toLocaleString` group *that*, then
// splitting the single correctly-grouped string back into a dim prefix and
// the real live text — never overlaying two independently-grouped strings
// again. This works because Indian grouping's comma positions, counted
// from the right, never change when more digits are prepended — the tail
// of the combined grouped string is always exactly the live number's own
// formatted text, byte for byte, so splitting on `live.length` from the
// end is always correct, not just for today's particular digit counts.
// Always INDIAN_LOCALE for the digits themselves (same as formatWeightIn's
// own number formatting) — `lang` only ever changes the unit *label* text
// elsewhere, never the digit grouping, so this doesn't take a `lang` param.
export const splitGhostDigits = (weightKg: number, ghostPattern: string): GhostSplit => {
    const live = Math.round(weightKg).toLocaleString(INDIAN_LOCALE);
    if (weightKg < 0) return { prefix: "", live };

    const ghostDigits = ghostPattern.replace(/\D/g, "");
    const padChar = ghostDigits[0] ?? "8";
    const liveDigitCount = String(Math.round(weightKg)).length;
    const padCount = ghostDigits.length - liveDigitCount;
    if (padCount <= 0) return { prefix: "", live };

    const padded = padChar.repeat(padCount) + String(Math.round(weightKg));
    const grouped = Number(padded).toLocaleString(INDIAN_LOCALE);
    // `grouped` always ends with `live` verbatim — see this file's own
    // comment on why the tail is invariant. Slicing on `live.length` from
    // the end (rather than trying to recompute where the padding "ends")
    // is what keeps this correct for every digit count, not just the ones
    // tested against.
    return { prefix: grouped.slice(0, grouped.length - live.length), live };
};
