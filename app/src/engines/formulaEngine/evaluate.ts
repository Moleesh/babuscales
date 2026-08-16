import {
    compare,
    add,
    sub,
    mul,
    div,
    abs,
    ceilToInt,
    toNumber,
    round,
    fromString,
    negate,
    toDecimalString,
} from "./Decimal";
import type { Decimal } from "./Decimal";
import type { FormulaExpr } from "./parse";

// A formula value is a Decimal (weights and money share one representation),
// a boolean (comparisons, `If` conditions) or a string
// (`Category(Material) == "Mineral"`).
export type FormulaValue = Decimal | boolean | string;

export interface FormulaContext {
    /** Resolves a bare identifier — `Gross`, `Tare`, `Credit`. */
    getVariable: (name: string) => FormulaValue;
    /** Resolves a site-specific function not built into the language — `Rate(Material)`, `Capacity(VehicleType)`. */
    callFunction?: (name: string, args: FormulaValue[]) => FormulaValue;
}

// Bug fix (found writing evaluate.test.ts): plain `JSON.stringify(v)`
// crashes with "Do not know how to serialize a BigInt" the moment `v` is a
// Decimal (its `mantissa` field is a bigint) — exactly the case `asBoolean`
// hits on a formula mistake like `If(Gross, ...)`. That crash replaced the
// intended "expected a boolean" message with an unrelated one.
const describeValue = (v: FormulaValue): string =>
    typeof v === "object" ? `Decimal(${toDecimalString(v)})` : JSON.stringify(v);

const asDecimal = (v: FormulaValue, where: string): Decimal => {
    if (typeof v === "object") return v;
    throw new Error(`Formula error: expected a number in ${where}, got ${describeValue(v)}`);
};
const asBoolean = (v: FormulaValue, where: string): boolean => {
    if (typeof v === "boolean") return v;
    throw new Error(`Formula error: expected a boolean in ${where}, got ${describeValue(v)}`);
};

// The division default when a formula doesn't ask for a specific rounding
// (e.g. the numerator of `Ceil(Net / 1000)`) — generous enough that a
// following Ceil/Round is exact, not the final precision itself.
const DIVISION_WORKING_SCALE = 6;

const EQUALITY_OPS = new Set(["==", "!="]);
const COMPARISON_OPS = new Set(["<", ">", "<=", ">="]);

const evalEquality = (op: string, left: FormulaValue, right: FormulaValue): boolean => {
    const equal =
        typeof left === "object" && typeof right === "object"
            ? compare(left, right) === 0
            : left === right;
    return op === "==" ? equal : !equal;
};

const evalComparison = (op: string, left: FormulaValue, right: FormulaValue): boolean => {
    const cmp = compare(asDecimal(left, op), asDecimal(right, op));
    if (op === "<") return cmp < 0;
    if (op === ">") return cmp > 0;
    if (op === "<=") return cmp <= 0;
    return cmp >= 0;
};

const evalArithmetic = (op: string, left: FormulaValue, right: FormulaValue): FormulaValue => {
    const l = asDecimal(left, op);
    const r = asDecimal(right, op);
    if (op === "+") return add(l, r);
    if (op === "-") return sub(l, r);
    if (op === "*") return mul(l, r);
    if (op === "/") return div(l, r, DIVISION_WORKING_SCALE);
    throw new Error(`Formula error: unknown operator "${op}"`);
};

// Dispatch by op-kind rather than one flat if-chain — each kind's own
// complexity (equality's type-branch, comparison's cmp-branch, arithmetic's
// operator-branch) stays isolated instead of stacking into a single
// function's cognitive-complexity score.
const evalBinary = (op: string, left: FormulaValue, right: FormulaValue): FormulaValue => {
    if (EQUALITY_OPS.has(op)) return evalEquality(op, left, right);
    if (COMPARISON_OPS.has(op)) return evalComparison(op, left, right);
    return evalArithmetic(op, left, right);
};

const BUILTINS: Record<string, (args: FormulaValue[]) => FormulaValue> = {
    If: (args) => {
        const [cond, whenTrue, whenFalse] = args;
        if (cond === undefined || whenTrue === undefined || whenFalse === undefined) {
            throw new Error("If() takes exactly 3 arguments");
        }
        return asBoolean(cond, "If()") ? whenTrue : whenFalse;
    },
    Abs: (args) => abs(asDecimal(requireOne(args, "Abs"), "Abs()")),
    Ceil: (args) => ceilToInt(asDecimal(requireOne(args, "Ceil"), "Ceil()")),
    Round: (args) => {
        const [value, scale] = args;
        if (value === undefined) throw new Error("Round() takes 1 or 2 arguments");
        const scaleNum =
            scale !== undefined ? Number(toNumber(asDecimal(scale, "Round() scale"))) : 0;
        return round(asDecimal(value, "Round()"), scaleNum);
    },
    Min: (args) => {
        const [a, b] = args;
        if (a === undefined || b === undefined) throw new Error("Min() takes exactly 2 arguments");
        return compare(asDecimal(a, "Min()"), asDecimal(b, "Min()")) <= 0 ? a : b;
    },
    Max: (args) => {
        const [a, b] = args;
        if (a === undefined || b === undefined) throw new Error("Max() takes exactly 2 arguments");
        return compare(asDecimal(a, "Max()"), asDecimal(b, "Max()")) >= 0 ? a : b;
    },
};

const requireOne = (args: FormulaValue[], name: string): FormulaValue => {
    const [value] = args;
    if (value === undefined || args.length !== 1)
        throw new Error(`${name}() takes exactly 1 argument`);
    return value;
};

// The language has no loops, so the only runaway risk is pathological
// nesting — this is the "hard time bound" the language needs, enforced as
// a depth guard rather than a wall clock (the evaluator is synchronous).
const MAX_DEPTH = 64;

export const evaluateExpr = (expr: FormulaExpr, ctx: FormulaContext, depth = 0): FormulaValue => {
    if (depth > MAX_DEPTH) throw new Error("Formula error: expression nested too deeply");
    switch (expr.kind) {
        case "Number":
            return fromString(expr.value);
        case "String":
            return expr.value;
        case "Identifier":
            return ctx.getVariable(expr.name);
        case "Unary":
            return negate(asDecimal(evaluateExpr(expr.operand, ctx, depth + 1), "unary -"));
        case "Binary":
            return evalBinary(
                expr.op,
                evaluateExpr(expr.left, ctx, depth + 1),
                evaluateExpr(expr.right, ctx, depth + 1),
            );
        case "Call": {
            const args = expr.args.map((arg) => evaluateExpr(arg, ctx, depth + 1));
            const builtin = BUILTINS[expr.callee];
            if (builtin) return builtin(args);
            if (ctx.callFunction) return ctx.callFunction(expr.callee, args);
            throw new Error(`Formula error: unknown function "${expr.callee}"`);
        }
        default: {
            const exhaustive: never = expr;
            throw new Error(`Formula error: unhandled expression ${JSON.stringify(exhaustive)}`);
        }
    }
};
