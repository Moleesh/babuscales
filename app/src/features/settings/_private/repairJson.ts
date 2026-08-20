// Best-effort fixes for the mistakes a hand-edited or LLM-pasted schema
// tends to have, so the paste box (and Apply itself) can recover from them
// instead of just reporting "not valid JSON":
//   - `//` and `/* */` comments
//   - a trailing comma before `}`/`]`
//   - an object key typed without quotes (`FieldId:` instead of `"FieldId":`)
//   - a string written with single quotes instead of double quotes
// Every step is regex-based and string-literal-aware — it never rewrites
// anything inside an already-quoted `"..."` run, so a comment-like or
// comma-like sequence inside a real value is left alone. Purely a text
// transform: the result still has to pass JSON.parse, same as any other
// pasted text.
export const repairJson = (text: string): string =>
    stripComments(text)
        .replace(/,(\s*[}\]])/g, "$1")
        .replace(
            /("(?:[^"\\]|\\.)*")|([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g,
            (_match, str: string | undefined, lead: string, key: string) => (str ? str : `${lead}"${key}":`),
        )
        .replace(
            /("(?:[^"\\]|\\.)*")|'((?:[^'\\]|\\.)*)'/g,
            (_match, dq: string | undefined, sq: string | undefined) =>
                dq ?? `"${(sq ?? "").replace(/\\'/g, "'").replace(/"/g, '\\"')}"`,
        );

// Drops `//line` and `/* block */` comments, leaving anything inside a
// `"..."` string untouched (so a URL like `"https://example.com"` survives).
const stripComments = (text: string): string =>
    text.replace(/("(?:[^"\\]|\\.)*")|\/\/.*$|\/\*[\s\S]*?\*\//gm, (_match, str: string | undefined) => str ?? "");
