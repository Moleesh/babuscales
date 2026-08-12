import type { LanguagePack } from "./types";

// The uploaded-pack file format (Settings → Fields & language) — flat
// `key="value"` lines, not JSON. A translator opens this in Notepad, not a
// JSON validator: no braces to balance, no trailing-comma trap, one line
// per string. Three metadata lines (bare, unquoted) up top, then one quoted
// entry per string:
//
//   Code=ta
//   Name=தமிழ்
//   Version=1
//
//   nav.dash="முகப்பு"
//   nav.weigh="எடைபோடல்"
//
// `#` starts a comment (the whole line is ignored); blank lines are
// ignored. A value may escape a literal `"` as `\"` and a newline as `\n`
// — the only two escapes this format needs, since every other character a
// UI string uses is already safe inside plain quotes.

const METADATA_KEYS = ["Code", "Name", "Version"] as const;
type MetadataKey = (typeof METADATA_KEYS)[number];

const unescapeValue = (raw: string): string =>
    raw.replace(/\\(["n])/g, (_m, c: string) => (c === "n" ? "\n" : '"'));

const QUOTED_LINE = /^([A-Za-z0-9_.]+)\s*=\s*"((?:\\.|[^"\\])*)"\s*$/;
const BARE_LINE = /^([A-Za-z]+)\s*=\s*(.*)$/;

/** Parses the `key="value"` pack format. Never throws — a malformed line is reported by number so an upload error points a translator at the exact line to fix, same spirit as `schemaJson.ts`'s zod issue messages. */
export const parseLangFile = (text: string): { pack: LanguagePack } | { error: string } => {
    const metadata: Partial<Record<MetadataKey, string>> = {};
    const strings: Record<string, string> = {};

    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]?.trim() ?? "";
        if (line === "" || line.startsWith("#")) continue;

        const quoted = QUOTED_LINE.exec(line);
        if (quoted) {
            const [, key, rawValue] = quoted;
            if (key) strings[key] = unescapeValue(rawValue ?? "");
            continue;
        }

        const bare = BARE_LINE.exec(line);
        if (bare && METADATA_KEYS.includes(bare[1] as MetadataKey)) {
            metadata[bare[1] as MetadataKey] = bare[2]?.trim();
            continue;
        }

        return { error: `Line ${i + 1}: not a recognised "key=\\"value\\"" line — "${line}"` };
    }

    if (!metadata.Code) return { error: 'Missing metadata line: Code="…" (e.g. Code=ta)' };
    if (!metadata.Name) return { error: 'Missing metadata line: Name="…" (e.g. Name=தமிழ்)' };
    const version = Number(metadata.Version ?? "");
    if (!Number.isInteger(version) || version <= 0) {
        return { error: "Missing or invalid metadata line: Version=1 (a positive whole number)" };
    }

    return {
        pack: { Code: metadata.Code, Name: metadata.Name, Version: version, Strings: strings },
    };
};

/** The inverse of `parseLangFile` — used by "Download as .lang" (FieldsLanguagePane) so an admin can start from this app's own built-in pack rather than an empty file. */
export const serializeLangFile = (pack: LanguagePack): string => {
    const escape = (value: string): string =>
        value.replace(/["\n]/g, (c) => (c === "\n" ? "\\n" : '\\"'));
    const lines = [
        `Code=${pack.Code}`,
        `Name=${pack.Name}`,
        `Version=${String(pack.Version)}`,
        "",
        ...Object.entries(pack.Strings).map(([key, value]) => `${key}="${escape(value)}"`),
    ];
    return lines.join("\n");
};
