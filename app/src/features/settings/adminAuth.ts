import { sha256Hex } from "@db/hash";

// The mock's own default (demo/BabuScale-demo.html's `cfg.admPw = "1234"`) —
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

export interface HashedPassword {
    Hash: string;
    Salt: string;
}

// A single-admin, local-machine gate (PLAN's "admin password to change
// configuration"), not a multi-user login perimeter — one salted SHA-256
// round via the same `sha256Hex` the audit hash chain already uses (no new
// crypto surface). The salt makes the stored hash useless without the row
// it came from; that is enough for what this is protecting.
export const hashAdminPassword = async (
    password: string,
    saltHex?: string,
): Promise<HashedPassword> => {
    const salt = saltHex ?? randomSaltHex();
    const hash = await sha256Hex(`${salt}:${password}`);
    return { Hash: hash, Salt: salt };
};

export const verifyAdminPassword = async (
    password: string,
    hash: string,
    salt: string,
): Promise<boolean> => {
    if (!hash || !salt) return false;
    return (await sha256Hex(`${salt}:${password}`)) === hash;
};
