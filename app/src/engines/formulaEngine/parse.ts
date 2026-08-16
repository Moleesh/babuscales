import type { Token } from "./tokenize";
import { tokenize } from "./tokenize";

// Recursive-descent parser over the token stream — precedence, low to
// high: comparison, additive, multiplicative, unary, primary. No loops,
// no assignment, no statements: a formula is one expression.
export type FormulaExpr =
    | { kind: "Number"; value: string }
    | { kind: "String"; value: string }
    | { kind: "Identifier"; name: string }
    | { kind: "Call"; callee: string; args: FormulaExpr[] }
    | { kind: "Binary"; op: string; left: FormulaExpr; right: FormulaExpr }
    | { kind: "Unary"; op: "-"; operand: FormulaExpr };

class Cursor {
    private index = 0;
    constructor(private readonly tokens: Token[]) {}

    peek(): Token {
        return this.tokens[this.index] ?? { kind: "EOF", text: "", pos: -1 };
    }
    next(): Token {
        const token = this.peek();
        this.index += 1;
        return token;
    }
    expect(kind: Token["kind"]): Token {
        const token = this.next();
        if (token.kind !== kind) {
            throw new Error(
                `Formula parse error: expected ${kind}, got "${token.text}" at ${token.pos}`,
            );
        }
        return token;
    }
}

const COMPARISON_OPS = new Set(["==", "!=", "<", ">", "<=", ">="]);
const ADDITIVE_OPS = new Set(["+", "-"]);
const MULTIPLICATIVE_OPS = new Set(["*", "/"]);

const parseComparison = (c: Cursor): FormulaExpr => {
    let left = parseAdditive(c);
    while (c.peek().kind === "Operator" && COMPARISON_OPS.has(c.peek().text)) {
        const op = c.next().text;
        left = { kind: "Binary", op, left, right: parseAdditive(c) };
    }
    return left;
};

const parseAdditive = (c: Cursor): FormulaExpr => {
    let left = parseMultiplicative(c);
    while (c.peek().kind === "Operator" && ADDITIVE_OPS.has(c.peek().text)) {
        const op = c.next().text;
        left = { kind: "Binary", op, left, right: parseMultiplicative(c) };
    }
    return left;
};

const parseMultiplicative = (c: Cursor): FormulaExpr => {
    let left = parseUnary(c);
    while (c.peek().kind === "Operator" && MULTIPLICATIVE_OPS.has(c.peek().text)) {
        const op = c.next().text;
        left = { kind: "Binary", op, left, right: parseUnary(c) };
    }
    return left;
};

const parseUnary = (c: Cursor): FormulaExpr => {
    if (c.peek().kind === "Operator" && c.peek().text === "-") {
        c.next();
        return { kind: "Unary", op: "-", operand: parseUnary(c) };
    }
    return parsePrimary(c);
};

const parseArgs = (c: Cursor): FormulaExpr[] => {
    const args: FormulaExpr[] = [];
    if (c.peek().kind === "RParen") return args;
    args.push(parseComparison(c));
    while (c.peek().kind === "Comma") {
        c.next();
        args.push(parseComparison(c));
    }
    return args;
};

const parsePrimary = (c: Cursor): FormulaExpr => {
    const token = c.next();
    if (token.kind === "Number") return { kind: "Number", value: token.text };
    if (token.kind === "String") return { kind: "String", value: token.text };
    if (token.kind === "LParen") {
        const expr = parseComparison(c);
        c.expect("RParen");
        return expr;
    }
    if (token.kind === "Identifier") {
        if (c.peek().kind === "LParen") {
            c.next();
            const args = parseArgs(c);
            c.expect("RParen");
            return { kind: "Call", callee: token.text, args };
        }
        return { kind: "Identifier", name: token.text };
    }
    throw new Error(`Formula parse error: unexpected token "${token.text}" at ${token.pos}`);
};

export const parseFormula = (source: string): FormulaExpr => {
    const cursor = new Cursor(tokenize(source));
    const expr = parseComparison(cursor);
    cursor.expect("EOF");
    return expr;
};
