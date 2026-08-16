import type { JsonRecord } from "./types";

// SHA-256, hex-encoded. Web Crypto is available in the browser, the Tauri
// webview and Node 19+, so this one function works unchanged in every
// adapter — no platform branch needed. Text is UTF-8 encoded first; raw
// bytes (an asset's contents) are hashed as given.
export const sha256Hex = async (input: string | Uint8Array): Promise<string> => {
    const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
    // TS 5.7's DOM lib types `Uint8Array` as generic over `ArrayBufferLike`,
    // which no longer structurally matches `BufferSource` — a known lib
    // mismatch, not a real type hazard; both are byte views at runtime.
    const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
};

// Recursively sorts object keys so the same body always serialises to the
// same bytes, regardless of insertion order. Without this, `body_hash`
// would change on a round trip through JSON.parse/stringify
// even though nothing in the document did.
const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value as JsonRecord)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, v]) => [key, canonicalize(v)] as const);
        return Object.fromEntries(entries);
    }
    return value;
};

// `body_hash` — "hash of CURRENT body, not a chain". Detects a
// silently altered record; it does not, by itself, prove ordering.
export const hashBody = (body: JsonRecord): Promise<string> =>
    sha256Hex(JSON.stringify(canonicalize(body)));

// One link in the `audit` hash chain — mixes the previous row's hash into
// this row's content so altering any past entry breaks every hash after it.
export const hashAuditRow = (content: JsonRecord, prevHash: string | null): Promise<string> =>
    sha256Hex(JSON.stringify(canonicalize(content)) + "|" + (prevHash ?? ""));
