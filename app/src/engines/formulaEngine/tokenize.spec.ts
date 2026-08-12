import { describe, expect, it } from "vitest";

import { tokenize } from "./tokenize";

describe("tokenize", () => {
    it("reads numbers, identifiers, operators and punctuation, ending in EOF", () => {
        const tokens = tokenize("Ceil(Net / 1000)");
        expect(tokens.map((t) => [t.kind, t.text])).toEqual([
            ["Identifier", "Ceil"],
            ["LParen", "("],
            ["Identifier", "Net"],
            ["Operator", "/"],
            ["Number", "1000"],
            ["RParen", ")"],
            ["EOF", ""],
        ]);
    });

    it("reads a two-character comparison operator as one token, not two", () => {
        const tokens = tokenize("Credit >= 100");
        expect(tokens[1]).toMatchObject({ kind: "Operator", text: ">=" });
    });

    it("reads a quoted string literal", () => {
        const tokens = tokenize('Category(Material) == "Mineral"');
        const stringToken = tokens.find((t) => t.kind === "String");
        expect(stringToken).toMatchObject({ text: "Mineral" });
    });

    it("skips whitespace between tokens", () => {
        const tokens = tokenize("  1   +   2  ");
        expect(tokens.map((t) => t.kind)).toEqual(["Number", "Operator", "Number", "EOF"]);
    });

    it("throws on an unterminated string literal", () => {
        expect(() => tokenize('"unterminated')).toThrow(/Unterminated string literal/);
    });

    it("throws on an unrecognised character", () => {
        expect(() => tokenize("1 # 2")).toThrow(/Unexpected character/);
    });
});
