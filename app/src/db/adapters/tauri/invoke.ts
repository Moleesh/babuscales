import { invoke as tauriInvoke } from "@tauri-apps/api/core";

// `AppError` (src-tauri/src/error.rs) serialises to a plain string, so a
// failed `invoke()` rejects with a string, not an `Error` — normalised here
// once so every caller in this adapter can treat failures the same way the
// memory adapter's thrown `Error`s already are.
export const invoke = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
    try {
        return await tauriInvoke<T>(command, args);
    } catch (reason) {
        throw reason instanceof Error ? reason : new Error(String(reason));
    }
};

// Tauri's `invoke()` JSON-serialises its arguments, and `JSON.stringify` on
// a `Uint8Array` produces `{"0":1,"1":2,...}` — an object, not the JSON
// array Rust's `Vec<u8>` deserialises from. Every asset/backup byte payload
// crosses the boundary through these two functions instead of raw.
export const bytesToWire = (bytes: Uint8Array): number[] => Array.from(bytes);
export const bytesFromWire = (bytes: number[]): Uint8Array => new Uint8Array(bytes);
