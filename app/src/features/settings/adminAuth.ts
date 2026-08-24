// The mock's own default (demo/BabuScales-demo.html's `cfg.admPw = "1234"`) —
// what a fresh install's Settings row is created with, changeable from the
// System pane once unlocked.
export const DEFAULT_ADMIN_PASSWORD = "1234";

const randomSaltHex = (): string => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
};

const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};

export interface HashedPassword {
    Hash: string;
    Salt: string;
}

// OWASP's 2023 minimum recommendation for PBKDF2-HMAC-SHA256. Web Crypto's
// PBKDF2 is available everywhere `sha256Hex` already relies on (browser,
// Tauri webview, Node 19+), so this needs no new platform surface.
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_PREFIX = "pbkdf2$";

const pbkdf2Hex = async (password: string, saltHex: string, iterations: number): Promise<string> => {
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- same DOM-lib BufferSource/Uint8Array mismatch sha256Hex documents; both are byte views at runtime.
        { name: "PBKDF2", salt: hexToBytes(saltHex) as BufferSource, iterations, hash: "SHA-256" },
        keyMaterial,
        256,
    );
    return Array.from(new Uint8Array(bits))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
};

// A single-admin, local-machine gate (PLAN's "admin password to change
// configuration"), not a multi-user login perimeter — but still worth being
// resistant to local brute force, which a single bare SHA-256 round isn't
// (a stolen/backed-up Settings row could be tried at GPU billions-per-second
// speed offline). Hashed with PBKDF2-HMAC-SHA256 at PBKDF2_ITERATIONS rounds
// instead, salted the same way as before. New hashes are stored as
// `pbkdf2$<iterations>$<hex>` — the iteration count travels with the hash so
// it can be raised later without invalidating older rows.
export const hashAdminPassword = async (password: string, saltHex?: string): Promise<HashedPassword> => {
    const salt = saltHex ?? randomSaltHex();
    const hash = await pbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
    return { Hash: `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${hash}`, Salt: salt };
};

// Pre-release, so no installed base to stay compatible with — every stored
// hash is the `pbkdf2$<iterations>$<hex>` format `hashAdminPassword` above
// produces; anything else is just treated as a non-match rather than
// falling back to the old single-round scheme.
export const verifyAdminPassword = async (password: string, hash: string, salt: string): Promise<boolean> => {
    if (!hash || !salt || !hash.startsWith(PBKDF2_PREFIX)) return false;
    const [, iterationsRaw, storedHex] = hash.split("$");
    const iterations = Number(iterationsRaw);
    if (!storedHex || !Number.isFinite(iterations) || iterations <= 0) return false;
    return (await pbkdf2Hex(password, salt, iterations)) === storedHex;
};
