// The lexer for the formula language (PLAN §8.1). Deliberately tiny: no
// eval, no IO — just numbers, identifiers, string literals, operators and
// punctuation. A field's formula is untrusted-ish site configuration, not
// code the app ships with, so this stays a closed grammar.
export type TokenKind =
    "Number" | "String" | "Identifier" | "Operator" | "LParen" | "RParen" | "Comma" | "EOF";

export interface Token {
    kind: TokenKind;
    text: string;
    pos: number;
}

const OPERATORS = ["<=", ">=", "==", "!=", "+", "-", "*", "/", "<", ">"];

export const tokenize = (source: string): Token[] => {
    const tokens: Token[] = [];
    let i = 0;

    const peekMatches = (candidates: string[]): string | null =>
        candidates.find((c) => source.startsWith(c, i)) ?? null;

    while (i < source.length) {
        const ch = source[i];
        if (ch === undefined) break;

        if (/\s/.test(ch)) {
            i += 1;
            continue;
        }
        if (ch === "(") {
            tokens.push({ kind: "LParen", text: ch, pos: i });
            i += 1;
            continue;
        }
        if (ch === ")") {
            tokens.push({ kind: "RParen", text: ch, pos: i });
            i += 1;
            continue;
        }
        if (ch === ",") {
            tokens.push({ kind: "Comma", text: ch, pos: i });
            i += 1;
            continue;
        }
        if (ch === '"') {
            const start = i;
            i += 1;
            let value = "";
            while (i < source.length && source[i] !== '"') {
                value += source[i];
                i += 1;
            }
            if (source[i] !== '"') throw new Error(`Unterminated string literal at ${start}`);
            i += 1;
            tokens.push({ kind: "String", text: value, pos: start });
            continue;
        }
        if (/[0-9]/.test(ch)) {
            const start = i;
            while (i < source.length && /[0-9.]/.test(source[i] ?? "")) i += 1;
            tokens.push({ kind: "Number", text: source.slice(start, i), pos: start });
            continue;
        }
        if (/[A-Za-z_]/.test(ch)) {
            const start = i;
            while (i < source.length && /[A-Za-z0-9_]/.test(source[i] ?? "")) i += 1;
            tokens.push({ kind: "Identifier", text: source.slice(start, i), pos: start });
            continue;
        }
        const op = peekMatches(OPERATORS);
        if (op) {
            tokens.push({ kind: "Operator", text: op, pos: i });
            i += op.length;
            continue;
        }
        throw new Error(`Unexpected character "${ch}" at ${i}`);
    }

    tokens.push({ kind: "EOF", text: "", pos: i });
    return tokens;
};
