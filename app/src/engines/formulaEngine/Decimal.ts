// A fixed-point decimal, BigInt-backed: "Money and rates are
// decimal strings with BigInt-backed arithmetic — never JavaScript floats."
// Weights use the same type at scale 0, so the formula engine has
// exactly one number representation, not two.
export interface Decimal {
    readonly mantissa: bigint;
    /** value = mantissa / 10^scale */
    readonly scale: number;
}

export const ZERO: Decimal = { mantissa: 0n, scale: 0 };

const pow10 = (n: number): bigint => 10n ** BigInt(n);

export const fromInt = (n: number): Decimal => ({ mantissa: BigInt(Math.trunc(n)), scale: 0 });

/** Parses a plain decimal string ("18780", "-42.50"). Throws on anything else — never `eval`, never a locale-formatted string. */
export const fromString = (text: string): Decimal => {
    const trimmed = text.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        throw new Error(`Decimal.fromString: not a plain decimal literal: "${text}"`);
    }
    const negative = trimmed.startsWith("-");
    const unsigned = negative ? trimmed.slice(1) : trimmed;
    const [whole, frac = ""] = unsigned.split(".");
    const mantissa = BigInt(whole + frac) * (negative ? -1n : 1n);
    return { mantissa, scale: frac.length };
};

const align = (a: Decimal, b: Decimal): [bigint, bigint, number] => {
    const scale = Math.max(a.scale, b.scale);
    return [a.mantissa * pow10(scale - a.scale), b.mantissa * pow10(scale - b.scale), scale];
};

export const add = (a: Decimal, b: Decimal): Decimal => {
    const [am, bm, scale] = align(a, b);
    return { mantissa: am + bm, scale };
};

export const sub = (a: Decimal, b: Decimal): Decimal => {
    const [am, bm, scale] = align(a, b);
    return { mantissa: am - bm, scale };
};

export const mul = (a: Decimal, b: Decimal): Decimal => ({
    mantissa: a.mantissa * b.mantissa,
    scale: a.scale + b.scale,
});

export type RoundingMode = "HalfUp" | "Down" | "Up";

/** Divides to exactly `resultScale` fractional digits, rounding per `mode` (default: half away from zero). Throws on division by zero. */
export const div = (
    a: Decimal,
    b: Decimal,
    resultScale: number,
    mode: RoundingMode = "HalfUp",
): Decimal => {
    if (b.mantissa === 0n) throw new Error("Decimal division by zero");

    const negative = a.mantissa < 0n !== b.mantissa < 0n;
    const numAbs = a.mantissa < 0n ? -a.mantissa : a.mantissa;
    const denAbs = b.mantissa < 0n ? -b.mantissa : b.mantissa;

    // Bug fix (found writing Decimal.test.ts — Round(1.005, 2) was
    // returning 1.00, not 1.01): when `shift` is negative, the target scale
    // asks for *fewer* fractional digits than the operands already carry, so
    // we must scale the denominator UP, never the numerator DOWN — dividing
    // the numerator down first (the old `numAbs / pow10(-shift)`) truncates
    // it with plain integer division before the remainder-based rounding
    // below ever runs, silently discarding the exact digit HalfUp/Up need.
    const shift = resultScale + b.scale - a.scale;
    const [scaledNumerator, scaledDenominator] =
        shift >= 0 ? [numAbs * pow10(shift), denAbs] : [numAbs, denAbs * pow10(-shift)];

    let quotient = scaledNumerator / scaledDenominator;
    const remainder = scaledNumerator % scaledDenominator;
    if (remainder !== 0n) {
        if (mode === "Up") quotient += 1n;
        else if (mode === "HalfUp" && remainder * 2n >= scaledDenominator) quotient += 1n;
    }
    return { mantissa: negative ? -quotient : quotient, scale: resultScale };
};

export const compare = (a: Decimal, b: Decimal): -1 | 0 | 1 => {
    const [am, bm] = align(a, b);
    if (am < bm) return -1;
    if (am > bm) return 1;
    return 0;
};

export const abs = (d: Decimal): Decimal =>
    d.mantissa < 0n ? { mantissa: -d.mantissa, scale: d.scale } : d;
export const negate = (d: Decimal): Decimal => ({ mantissa: -d.mantissa, scale: d.scale });
export const isZero = (d: Decimal): boolean => d.mantissa === 0n;

/** True when `d` has a nonzero fractional part — the "is this actually a whole number" check the `DecimalsAllowed`-gated Money/Weight validators (masterFormBody.ts, ticketBody.ts, useWeighingTicket.ts, serialIndicator.ts) share, instead of each reimplementing it via `Number.isInteger(toNumber(d))` (lossy for a mantissa too large for a JS number). */
export const hasFraction = (d: Decimal): boolean =>
    d.scale > 0 && d.mantissa % pow10(d.scale) !== 0n;

/** Max fractional digits allowed once `Schema.DecimalsAllowed` is on — "may have a fraction, but not arbitrary precision" (schemaEngine/types.ts's `DecimalsAllowed` doc comment). */
export const MAX_DECIMALS_ALLOWED_SCALE = 2;

/**
 * The full three-way `DecimalsAllowed` gate shared by every Money/Weight
 * validation site: off means `d` must be a whole integer; on means `d` may
 * carry a fraction, but at most `MAX_DECIMALS_ALLOWED_SCALE` digits of it
 * (`fromString`'s `scale` is exactly the number of digits typed after the
 * point, no trailing-zero stripping, so this is a plain scale comparison —
 * no separate digit-counting regex needed once a value is already a
 * `Decimal`).
 */
export const withinDecimalsAllowed = (d: Decimal, decimalsAllowed: boolean): boolean =>
    decimalsAllowed ? d.scale <= MAX_DECIMALS_ALLOWED_SCALE : !hasFraction(d);

/** Rounds toward +infinity to a whole number — `Ceil()` in a formula (§8.1's `Ceil(Net / 1000)`). */
export const ceilToInt = (d: Decimal): Decimal => {
    if (d.scale === 0) return d;
    const p = pow10(d.scale);
    const q = d.mantissa / p;
    const r = d.mantissa % p;
    return { mantissa: r > 0n ? q + 1n : q, scale: 0 };
};

/** Rounds to `scale` fractional digits — `Round()` in a formula. */
export const round = (d: Decimal, scale: number, mode: RoundingMode = "HalfUp"): Decimal =>
    div(d, { mantissa: 1n, scale: 0 }, scale, mode);

export const toDecimalString = (d: Decimal): string => {
    const negative = d.mantissa < 0n;
    const magnitude = negative ? -d.mantissa : d.mantissa;
    const digits = magnitude.toString().padStart(d.scale + 1, "0");
    const whole = digits.slice(0, digits.length - d.scale) || "0";
    const frac = d.scale > 0 ? "." + digits.slice(digits.length - d.scale) : "";
    return (negative && magnitude !== 0n ? "-" : "") + whole + frac;
};

/** For display/legacy interop only — never round-trip a persisted value through this. */
export const toNumber = (d: Decimal): number => Number(toDecimalString(d));
