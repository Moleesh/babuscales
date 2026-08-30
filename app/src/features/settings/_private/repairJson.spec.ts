import { describe, expect, it } from "vitest";

import { repairJson } from "./repairJson";

const parses = (text: string): unknown => JSON.parse(repairJson(text));

describe("repairJson", () => {
    it("strips // line comments", () => {
        expect(parses(`{ "a": 1 // comment\n}`)).toEqual({ a: 1 });
    });

    it("strips /* block */ comments, including multi-line", () => {
        expect(parses(`{ /* hi\nthere */ "a": 1 }`)).toEqual({ a: 1 });
    });

    it("leaves a // or /* inside a real string value alone", () => {
        expect(parses(`{ "url": "https://example.com" }`)).toEqual({ url: "https://example.com" });
    });

    it("removes a trailing comma before } or ]", () => {
        expect(parses(`{ "a": 1, "b": [1, 2,], }`)).toEqual({ a: 1, b: [1, 2] });
    });

    it("quotes an unquoted object key", () => {
        expect(parses(`{ FieldId: "x" }`)).toEqual({ FieldId: "x" });
    });

    it("quotes multiple unquoted keys, including after a comma", () => {
        expect(parses(`{ FieldId: "x", Kind: "Text" }`)).toEqual({ FieldId: "x", Kind: "Text" });
    });

    it("leaves an already-quoted key untouched", () => {
        expect(parses(`{ "FieldId": "x" }`)).toEqual({ FieldId: "x" });
    });

    it("converts single-quoted strings to double-quoted", () => {
        expect(parses(`{ 'a': 'b' }`)).toEqual({ a: "b" });
    });

    it("escapes a double quote that ends up inside a converted single-quoted string", () => {
        expect(parses(`{ "a": 'say "hi"' }`)).toEqual({ a: 'say "hi"' });
    });

    it("unescapes an escaped single quote inside a single-quoted string", () => {
        expect(parses(`{ "a": 'it\\'s' }`)).toEqual({ a: "it's" });
    });

    it("leaves a double-quoted string containing a single quote untouched", () => {
        expect(parses(`{ "a": "it's fine" }`)).toEqual({ a: "it's fine" });
    });

    it("combines every fixup at once (comments, trailing comma, unquoted key, single quotes)", () => {
        const input = `{
            // schema
            FieldId: 'VehicleNo',
            Kind: "Text", /* trailing */
        }`;
        expect(parses(input)).toEqual({ FieldId: "VehicleNo", Kind: "Text" });
    });

    it("passes already-valid JSON through unchanged in effect", () => {
        expect(parses(`{"a":1,"b":"c"}`)).toEqual({ a: 1, b: "c" });
    });
});
