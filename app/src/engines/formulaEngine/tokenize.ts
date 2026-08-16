// The lexer for the formula language. Deliberately tiny: no
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
const PUNCTUATION: Record<string, TokenKind> = { "(": "LParen", ")": "RParen", ",": "Comma" };

// A single reader's result: the token it read (if any) and the index just
// past it. `null` means "this reader doesn't match here" — tokenize() tries
// the next one, rather than one reader branching on every possible token
// kind (that's what made the old single-loop version's cognitive complexity
// blow past budget).
type ReadResult = { token: Token; next: number } | null;

const readPunctuation = (source: string, i: number): ReadResult => {
    const ch = source[i];
    const kind = ch === undefined ? undefined : PUNCTUATION[ch];
    return kind ? { token: { kind, text: ch as string, pos: i }, next: i + 1 } : null;
};

const readStringLiteral = (source: string, i: number): ReadResult => {
    if (source[i] !== '"') return null;
    const start = i;
    let next = i + 1;
    let value = "";
    while (next < source.length && source[next] !== '"') {
        value += source[next];
        next += 1;
    }
    if (source[next] !== '"') throw new Error(`Unterminated string literal at ${start}`);
    return { token: { kind: "String", text: value, pos: start }, next: next + 1 };
};

const readNumber = (source: string, i: number): ReadResult => {
    if (!/[0-9]/.test(source[i] ?? "")) return null;
    let next = i;
    while (next < source.length && /[0-9.]/.test(source[next] ?? "")) next += 1;
    return { token: { kind: "Number", text: source.slice(i, next), pos: i }, next };
};

const readIdentifier = (source: string, i: number): ReadResult => {
    if (!/[A-Za-z_]/.test(source[i] ?? "")) return null;
    let next = i;
    while (next < source.length && /[A-Za-z0-9_]/.test(source[next] ?? "")) next += 1;
    return { token: { kind: "Identifier", text: source.slice(i, next), pos: i }, next };
};

const readOperator = (source: string, i: number): ReadResult => {
    const op = OPERATORS.find((candidate) => source.startsWith(candidate, i));
    return op ? { token: { kind: "Operator", text: op, pos: i }, next: i + op.length } : null;
};

const TOKEN_READERS = [readPunctuation, readStringLiteral, readNumber, readIdentifier, readOperator];

export const tokenize = (source: string): Token[] => {
    const tokens: Token[] = [];
    let i = 0;

    while (i < source.length) {
        if (/\s/.test(source[i] ?? "")) {
            i += 1;
            continue;
        }
        const result = TOKEN_READERS.reduce<ReadResult>(
            (found, reader) => found ?? reader(source, i),
            null,
        );
        if (!result) throw new Error(`Unexpected character "${source[i]}" at ${i}`);
        tokens.push(result.token);
        i = result.next;
    }

    tokens.push({ kind: "EOF", text: "", pos: i });
    return tokens;
};
