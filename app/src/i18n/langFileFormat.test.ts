import { describe, expect, it } from "vitest";

import { parseLangFile, serializeLangFile } from "./langFileFormat";

describe("parseLangFile: happy path", () => {
    it("parses metadata and string lines", () => {
        const text = ['Code=ta', 'Name=தமிழ்', "Version=1", "", 'nav.dash="முகப்பு"'].join("\n");
        const result = parseLangFile(text);
        expect(result).toEqual({
            pack: { Code: "ta", Name: "தமிழ்", Version: 1, Strings: { "nav.dash": "முகப்பு" } },
        });
    });

    it("ignores blank lines and # comments", () => {
        const text = [
            "# a language pack",
            "Code=fr",
            "Name=Français",
            "Version=2",
            "",
            "# strings below",
            'weigh.save="Enregistrer"',
        ].join("\n");
        const result = parseLangFile(text);
        expect("pack" in result && result.pack.Strings).toEqual({ "weigh.save": "Enregistrer" });
    });

    it("unescapes \\\" and \\n inside quoted values", () => {
        const text = ["Code=x", "Name=X", "Version=1", "", 'a.b="line one\\nline \\"two\\""'].join(
            "\n",
        );
        const result = parseLangFile(text);
        expect("pack" in result && result.pack.Strings["a.b"]).toBe('line one\nline "two"');
    });
});

describe("parseLangFile: error reporting", () => {
    it("reports a missing Code line", () => {
        const result = parseLangFile('Name=X\nVersion=1\n\na="b"');
        expect("error" in result && result.error).toMatch(/Code/);
    });

    it("reports an invalid Version", () => {
        const result = parseLangFile('Code=x\nName=X\nVersion=abc\n\na="b"');
        expect("error" in result && result.error).toMatch(/Version/);
    });

    it("reports the line number of an unrecognised line", () => {
        const result = parseLangFile('Code=x\nName=X\nVersion=1\n\nthis is not valid');
        expect("error" in result && result.error).toMatch(/Line 5/);
    });
});

describe("serializeLangFile", () => {
    it("round-trips through parseLangFile", () => {
        const pack = {
            Code: "ta",
            Name: "தமிழ்",
            Version: 5,
            Strings: { "a.b": 'has "quotes" and\nnewline' },
        };
        const result = parseLangFile(serializeLangFile(pack));
        expect(result).toEqual({ pack });
    });
});
