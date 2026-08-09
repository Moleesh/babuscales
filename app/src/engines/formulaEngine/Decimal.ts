// A fixed-point decimal, BigInt-backed — PLAN §6.6: "Money and rates are
// decimal strings with BigInt-backed arithmetic — never JavaScript floats."
// Weights use the same type at scale 0, so the formula engine (§8.1) has
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

    const shift = resultScale + b.scale - a.scale;
    const scaledNumerator = shift >= 0 ? numAbs * pow10(shift) : numAbs / pow10(-shift);

    let quotient = scaledNumerator / denAbs;
    const remainder = scaledNumerator % denAbs;
    if (remainder !== 0n) {
        if (mode === "Up") quotient += 1n;
        else if (mode === "HalfUp" && remainder * 2n >= denAbs) quotient += 1n;
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
